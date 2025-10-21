import { MetaTag } from "libs/prisma";
import { OrderedSet } from "./ordered-set";
import { parseHtml, ParseOutput } from "./parse";
import { scrapePw } from "./playwright";

export type ScrapeStore = {
  urls: Record<
    string,
    { metaTags: MetaTag[]; text: string } | undefined | null
  >;
  urlSet: OrderedSet<string>;
};

type ScrapeResult = {
  error?: string;
  parseOutput: ParseOutput;
  statusCode: number;
};

function isSameHost(base: string, url: string) {
  const baseUrl = new URL(base);
  const urlObj = new URL(url);
  const normalizeHost = (host: string) => host.replace(/^www\./, "");
  return normalizeHost(baseUrl.host) === normalizeHost(urlObj.host);
}

export async function scrapeFetch(
  url: string
): Promise<{ text: string; statusCode: number }> {
  console.log("Scraping", url);
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Sec-Ch-Ua":
      '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    Connection: "keep-alive",
    DNT: "1",
  };

  const response = await fetch(url, {
    headers,
    credentials: "same-origin",
    signal: AbortSignal.timeout(10000),
  });
  return { text: await response.text(), statusCode: response.status };
}

export async function scrape(
  url: string,
  options?: {
    dynamicFallbackContentLength?: number;
    removeHtmlTags?: string;
    scrollSelector?: string;
    maxWait?: number;
  }
): Promise<ScrapeResult> {
  const { dynamicFallbackContentLength = 100 } = options ?? {};
  let { text, statusCode } = await scrapeFetch(url);
  const parsedText = parseHtml(text, options);
  let error = undefined;

  if (parsedText.text.length <= dynamicFallbackContentLength) {
    try {
      const pwResult = await scrapePw(url, {
        scrollSelector: options?.scrollSelector,
        maxWait: options?.maxWait,
      });
      text = pwResult.text;
      statusCode = pwResult.statusCode;
    } catch (e: any) {
      console.log(e);
      error = e.message;
    }
  }

  return { parseOutput: parseHtml(text, options), error, statusCode };
}

export type ScrapeWithLinksOptions = {
  skipRegex?: RegExp[];
  onPreScrape?: (url: string, store: ScrapeStore) => Promise<void>;
  dynamicFallbackContentLength?: number;
  allowOnlyRegex?: RegExp;
  scrollSelector?: string;
  maxWait?: number;
};

export async function scrapeWithLinks(
  url: string,
  store: ScrapeStore,
  baseUrl: string,
  options?: ScrapeWithLinksOptions
) {
  if (options?.onPreScrape) {
    options.onPreScrape(url, store);
  }
  const { parseOutput, statusCode } = await scrape(url, options);
  const { links: linkLinks, metaTags, text, markdown } = parseOutput;
  store.urls[url] = {
    metaTags,
    text,
  };

  console.log("StatusCode", statusCode);
  if (Math.floor(statusCode / 100) !== 2) {
    throw new Error(`Failed with status code ${statusCode}`);
  }

  for (const link of linkLinks) {
    if (!link.href) continue;

    const linkUrl = new URL(link.href, url).toString();

    if (!linkUrl) {
      console.log("Invalid link", link.href);
      continue;
    }

    if (!isSameHost(baseUrl, linkUrl.toString())) {
      continue;
    }

    let linkUrlStr = linkUrl.toString();
    linkUrlStr = linkUrlStr.split("#")[0];

    if (options?.skipRegex?.some((regex) => regex.test(linkUrlStr))) {
      continue;
    }

    if (options?.allowOnlyRegex && !options.allowOnlyRegex.test(linkUrlStr)) {
      continue;
    }

    store.urlSet.add(linkUrlStr);
  }

  return { text, markdown };
}

export function urlsNotFetched(store: ScrapeStore) {
  return store.urlSet.values().filter((url) => store.urls[url] === undefined);
}

export async function scrapeLoop(
  store: ScrapeStore,
  baseUrl: string,
  options?: {
    limit?: number;
    skipRegex?: RegExp[];
    allowOnlyRegex?: RegExp;
    onPreScrape?: (url: string, store: ScrapeStore) => Promise<void>;
    onComplete?: () => Promise<void>;
    afterScrape?: (
      url: string,
      opts: { text: string; markdown: string; error?: string }
    ) => Promise<void>;
    beforeScrape?: (url: string) => Promise<void>;
    dynamicFallbackContentLength?: number;
    removeHtmlTags?: string;
    shouldScrape?: (url?: string) => Promise<boolean>;
    scrollSelector?: string;
    maxWait?: number;
  }
) {
  const { limit = 5000 } = options ?? {};

  if (options?.shouldScrape && !(await options.shouldScrape())) {
    return;
  }

  while (urlsNotFetched(store).length > 0) {
    const url = urlsNotFetched(store)[0];

    if (options?.beforeScrape) {
      await options.beforeScrape(url);
    }

    let error = null;
    let text = "";
    let markdown = "";
    try {
      const result = await scrapeWithLinks(url, store, baseUrl, options);
      text = result.text;
      markdown = result.markdown;
    } catch (e: any) {
      error = e.message;
    }

    if (options?.afterScrape) {
      await options.afterScrape(url, { text, markdown, error });
    }

    if (Object.keys(store.urls).length >= limit) {
      console.log("Reached limit", limit);
      break;
    }

    if (options?.shouldScrape && !(await options.shouldScrape(url))) {
      break;
    }
  }

  if (options?.onComplete) {
    options.onComplete();
  }
}

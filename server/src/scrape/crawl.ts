import { MetaTag } from "@prisma/client";
import { OrderedSet } from "./ordered-set";
import { parseHtml } from "./parse";

export type ScrapeStore = {
  urls: Record<
    string,
    { metaTags: MetaTag[]; text: string } | undefined | null
  >;
  urlSet: OrderedSet<string>;
};

export async function scrape(url: string) {
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
  });
  return parseHtml(await response.text());
}

export async function scrapeWithLinks(
  url: string,
  store: ScrapeStore,
  baseUrl: string,
  options?: {
    skipRegex?: RegExp[];
    onPreScrape?: (url: string, store: ScrapeStore) => Promise<void>;
  }
) {
  if (options?.onPreScrape) {
    options.onPreScrape(url, store);
  }
  const { links: linkLinks, metaTags, text, markdown } = await scrape(url);
  store.urls[url] = {
    metaTags,
    text,
  };
  for (const link of linkLinks) {
    if (!link.href) continue;

    const linkUrl = new URL(link.href, url);

    if (!linkUrl.href.startsWith(baseUrl)) {
      continue;
    }

    let linkUrlStr = linkUrl.toString();
    linkUrlStr = linkUrlStr.split("#")[0];

    if (options?.skipRegex?.some((regex) => regex.test(linkUrlStr))) {
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
    onPreScrape?: (url: string, store: ScrapeStore) => Promise<void>;
    onComplete?: () => Promise<void>;
    afterScrape?: (
      url: string,
      opts: { text: string; markdown: string }
    ) => Promise<void>;
  }
) {
  const { limit = 300 } = options ?? {};

  while (urlsNotFetched(store).length > 0) {
    const url = urlsNotFetched(store)[0];
    const { text, markdown } = await scrapeWithLinks(
      url,
      store,
      baseUrl,
      options
    );

    if (options?.afterScrape) {
      await options.afterScrape(url, { text, markdown });
    }

    if (Object.keys(store.urls).length >= limit) {
      console.log("Reached limit", limit);
      break;
    }
  }

  if (options?.onComplete) {
    options.onComplete();
  }
}

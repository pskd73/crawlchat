import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { OrderedSet } from "./ordered-set";

export type ScrapeStore = {
  urls: Record<
    string,
    | { markdown: string; metaTags: { key: string; value: string }[] }
    | undefined
    | null
  >;
  urlSet: OrderedSet<string>;
};

export async function scrape(url: string) {
  console.log("Scraping", url);
  const response = await fetch(url);
  const html = await response.text();

  const $ = cheerio.load(html);

  const links = $("a")
    .map((_, link) => ({
      text: $(link).text().trim(),
      href: $(link).attr("href"),
    }))
    .toArray()
    .filter((link) => link.href);

  $("script").remove();
  $("style").remove();
  $("nav").remove();
  $("footer").remove();

  const metaTags: { key: string; value: string }[] = $("meta")
    .map((_, meta) => ({
      key: $(meta).attr("name") ?? $(meta).attr("property") ?? "",
      value: $(meta).attr("content") ?? "",
    }))
    .toArray()
    .filter((meta) => meta.key && meta.value);

  $("meta").remove();

  const turndownService = new TurndownService();
  turndownService.addRule("headings", {
    filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
    replacement: function (content, node) {
      const level = Number(node.nodeName.charAt(1));
      return "\n" + "#".repeat(level) + " " + content + "\n\n";
    },
  });

  const markdown = turndownService.turndown($("body").html()!);

  return {
    markdown,
    links,
    metaTags,
  };
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
  const {
    markdown: linkMarkdown,
    links: linkLinks,
    metaTags,
  } = await scrape(url);
  store.urls[url] = {
    markdown: linkMarkdown,
    metaTags,
  };
  for (const link of linkLinks) {
    if (!link.href) continue;

    const linkUrl = new URL(link.href, url);

    if (!linkUrl.href.startsWith(baseUrl)) continue;

    let linkUrlStr = linkUrl.toString();
    linkUrlStr = linkUrlStr.split("#")[0];

    if (options?.skipRegex?.some((regex) => regex.test(linkUrlStr))) {
      console.log("Skipping", linkUrlStr);
      continue;
    }

    store.urlSet.add(linkUrlStr);
  }
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
  }
) {
  const { limit = 1000 } = options ?? {};

  while (urlsNotFetched(store).length > 0) {
    await scrapeWithLinks(urlsNotFetched(store)[0], store, baseUrl, options);

    if (Object.keys(store.urls).length > limit) {
      console.log("Reached limit", limit);
      break;
    }
  }

  if (options?.onComplete) {
    options.onComplete();
  }
}

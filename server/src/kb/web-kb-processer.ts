import { KnowledgeGroup, prisma, Scrape } from "libs/prisma";
import { BaseKbProcesser, KbProcesserListener } from "./kb-processer";
import {
  ScrapeStore,
  scrapeWithLinks,
  ScrapeWithLinksOptions,
} from "../scrape/crawl";
import { OrderedSet } from "../scrape/ordered-set";
import { getMetaTitle } from "../scrape/parse";

export function urlsNotFetched(store: ScrapeStore) {
  return store.urlSet.values().filter((url) => store.urls[url] === undefined);
}

export class WebKbProcesser extends BaseKbProcesser {
  private readonly store: ScrapeStore;

  constructor(
    protected listener: KbProcesserListener,
    private readonly scrape: Scrape,
    private readonly knowledgeGroup: KnowledgeGroup,
    private readonly url: string,
    protected readonly options: {
      removeHtmlTags?: string;
      dynamicFallbackContentLength?: number;
      limit?: number;
      skipRegex?: RegExp[];
      allowOnlyRegex?: RegExp;
      scrollSelector?: string;
      maxWait?: number;
    }
  ) {
    super(listener);
    this.store = {
      urls: {},
      urlSet: new OrderedSet(),
    };
  }

  cleanUrl(url: string) {
    if (!url.startsWith("http")) {
      url = "https://" + url;
    }
    return url;
  }

  async onError(path: string, error: any) {
    super.onError(path, error);
    this.store.urls[path] = {
      metaTags: [],
      text: "ERROR",
    };
  }

  async process() {
    const url = this.url || this.scrape.url;
    if (!url) {
      throw new Error("No url provided");
    }

    const urlToScrape = this.cleanUrl(url);
    this.store.urlSet.add(urlToScrape);

    const limit = this.options.limit ?? 5000;

    const options: ScrapeWithLinksOptions = {
      dynamicFallbackContentLength: this.options.dynamicFallbackContentLength,
      skipRegex: this.options.skipRegex,
      allowOnlyRegex: this.options.allowOnlyRegex,
      scrollSelector: this.options.scrollSelector,
      maxWait: this.options.maxWait,
    };

    while (urlsNotFetched(this.store).length > 0) {
      const url = urlsNotFetched(this.store)[0];

      let error = null;
      let markdown = "";
      try {
        const result = await scrapeWithLinks(
          url,
          this.store,
          urlToScrape,
          options
        );
        markdown = result.markdown;
      } catch (e: any) {
        error = e.message;
      }

      const metaTags = this.store.urls[url]?.metaTags ?? [];
      await this.onContentAvailable(url, {
        text: markdown,
        error,
        metaTags: [],
        title: getMetaTitle(metaTags),
      });

      if (Object.keys(this.store.urls).length >= limit) {
        console.log("Reached limit", limit);
        break;
      }

      const group = await prisma.knowledgeGroup.findFirstOrThrow({
        where: { id: this.knowledgeGroup.id },
      });
      if (group.status !== "processing") {
        break;
      }
    }

    this.onComplete();
  }
}

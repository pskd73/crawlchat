import { KnowledgeGroup, prisma, Scrape } from "libs/prisma";
import {
  BaseKbProcesser,
  KbProcesserListener,
  KbProcessProgress,
} from "./kb-processer";
import { scrapeLoop, ScrapeStore } from "../scrape/crawl";
import { OrderedSet } from "../scrape/ordered-set";
import { getMetaTitle } from "../scrape/parse";

function calculateProgress(
  store: ScrapeStore,
  allowedMaxLinks?: number
): KbProcessProgress {
  const scrapedUrlCount = Object.values(store.urls).length;
  const maxLinks = allowedMaxLinks ? allowedMaxLinks : undefined;
  const actualRemainingUrlCount = store.urlSet.size() - scrapedUrlCount;
  const remainingUrlCount = maxLinks
    ? Math.min(maxLinks, actualRemainingUrlCount)
    : actualRemainingUrlCount;

  return { remaining: remainingUrlCount, completed: scrapedUrlCount };
}

export class WebKbProcesser extends BaseKbProcesser {
  private readonly store: ScrapeStore;

  constructor(
    protected listener: KbProcesserListener,
    private readonly scrape: Scrape,
    private readonly knowledgeGroup: KnowledgeGroup,
    private readonly url: string,
    protected readonly options: {
      hasCredits: () => Promise<boolean>;
      removeHtmlTags?: string;
      dynamicFallbackContentLength?: number;
      limit?: number;
      skipRegex?: RegExp[];
      allowOnlyRegex?: RegExp;
    }
  ) {
    super(listener, options);
    this.store = {
      urls: {},
      urlSet: new OrderedSet(),
    };
  }

  cleanUrl(url: string) {
    if (!url.startsWith("http")) {
      url = "https://" + url;
    }
    return url.toLowerCase();
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

    await scrapeLoop(this.store, urlToScrape, {
      removeHtmlTags: this.options.removeHtmlTags,
      dynamicFallbackContentLength: this.options.dynamicFallbackContentLength,
      limit: this.options.limit,
      skipRegex: this.options.skipRegex,
      allowOnlyRegex: this.options.allowOnlyRegex,
      onComplete: () => this.onComplete(),
      shouldScrape: async () => {
        if (!this.options.hasCredits()) {
          return false;
        }
        const group = await prisma.knowledgeGroup.findFirstOrThrow({
          where: { id: this.knowledgeGroup.id },
        });
        if (group.status !== "processing") {
          return false;
        }
        return true;
      },
      afterScrape: async (url, { markdown, error }) => {
        const progress = calculateProgress(this.store, this.options.limit);
        const metaTags = this.store.urls[url]?.metaTags ?? [];
        await this.onContentAvailable(
          url,
          {
            text: markdown,
            error,
            metaTags,
            title: getMetaTitle(metaTags),
          },
          progress
        );
      },
    });
  }
}

import type { Scrape } from "@prisma/client";

export function getScrapeTitle(scrape: Scrape) {
  for (const tag of scrape.metaTags) {
    if (tag.key.endsWith("title")) {
      return tag.value;
    }
  }
  return scrape.url;
}

import type { Browser } from "playwright";
import { chromium, Page } from "playwright";

let browser: Browser | null = null;

async function createBrowser() {
  const b = await chromium.launch({
    headless: true,
  });
  browser = b;
  b.on("disconnected", () => {
    browser = null;
  });
  return b;
}

async function getPage(): Promise<Page> {
  const browserInstance = browser || (await createBrowser());
  const context = await browserInstance.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  return await context.newPage();
}

async function closePage(page: Page) {
  const context = page.context();
  await page.close();
  await context.close();
}

export async function scrapePw(
  url: string,
  options?: { scrollSelector?: string; maxWait?: number }
) {
  console.log("Playwright scraping", url);

  const page = await getPage();

  const result = await (async () => {
    const response = await page.goto(url);
    const statusCode = response?.status() ?? -1;

    if (options?.maxWait) {
      await page.waitForTimeout(options.maxWait);
    } else {
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    }

    await page.waitForTimeout(5000);

    const scrollSelector = options?.scrollSelector;

    let previousHeight = 0;
    for (let i = 0; i < 10; i++) {
      console.log(`Scroll iteration ${i + 1}/10`);

      if (!scrollSelector) {
        break;
      }

      const currentHeight = await page.evaluate(
        (selector) => document.querySelector(selector)?.scrollHeight ?? 0,
        scrollSelector
      );

      if (i > 0 && currentHeight === previousHeight) {
        console.log("No new content loaded, stopping scroll");
        break;
      }

      previousHeight = currentHeight;
      await page.evaluate((selector) => {
        const scrollElement = document.querySelector(selector);
        if (!scrollElement) {
          return;
        }
        scrollElement.scrollTo(0, scrollElement.scrollHeight);
      }, scrollSelector);

      await page.waitForLoadState("networkidle", { timeout: 10000 });
      await page.waitForTimeout(1000);
    }

    const html = await page.content();
    return { text: html, statusCode };
  })().finally(async () => {
    await closePage(page).catch(() => {});
  });

  return result;
}

process.on("SIGTERM", async () => {
  if (browser) {
    await browser.close();
    browser = null;
  }
});

process.on("SIGINT", async () => {
  if (browser) {
    await browser.close();
    browser = null;
  }
});

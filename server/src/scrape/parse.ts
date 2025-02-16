import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { removeConsecutiveLinks, markdownToText } from "./markdown";
import type { MetaTag } from "@prisma/client";

const EXCLUDE_NON_MAIN_TAGS = [
  "header",
  "footer",
  "nav",
  "aside",
  ".header",
  ".top",
  ".navbar",
  "#header",
  ".footer",
  ".bottom",
  "#footer",
  ".sidebar",
  ".side",
  ".aside",
  "#sidebar",
  ".modal",
  ".popup",
  "#modal",
  ".overlay",
  ".ad",
  ".ads",
  ".advert",
  "#ad",
  ".lang-selector",
  ".language",
  "#language-selector",
  ".social",
  ".social-media",
  ".social-links",
  "#social",
  ".menu",
  ".navigation",
  "#nav",
  ".breadcrumbs",
  "#breadcrumbs",
  ".share",
  "#share",
  ".widget",
  "#widget",
  ".cookie",
  "#cookie",

  "script",
  "style",
  "p:empty",
  "div:empty",
  '[class*="sidebar"]',
  '[id*="sidebar"]',
  "iframe",
];

function cleanHtml($: cheerio.CheerioAPI) {
  for (const tag of EXCLUDE_NON_MAIN_TAGS) {
    $(tag).remove();
  }

  $("a").each((_, a) => {
    if ($(a).text().trim().length === 0) {
      $(a).remove();
    }
  });
}

export function parseHtml(html: string) {
  const $ = cheerio.load(html);

  const links = $("a")
    .map((_, link) => ({
      text: $(link).text().trim(),
      href: $(link).attr("href"),
    }))
    .toArray()
    .filter((link) => link.href);

  const metaTags: MetaTag[] = $("meta")
    .map((_, meta) => ({
      key: $(meta).attr("name") ?? $(meta).attr("property") ?? "",
      value: $(meta).attr("content") ?? "",
    }))
    .toArray()
    .filter((meta) => meta.key && meta.value);

  $("meta").remove();

  cleanHtml($);

  const turndownService = new TurndownService();
  turndownService.addRule("headings", {
    filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
    replacement: function (content, node) {
      const level = Number(node.nodeName.charAt(1));
      return (
        "\n" +
        "#".repeat(level) +
        " " +
        content.trim().replace(/\n/g, "") +
        "\n\n"
      );
    },
  });

  let content = $("main").html() ?? $("body").html();
  if (!content) {
    content = $("body").html();
  }
  let markdown = turndownService.turndown(content!);
  markdown = removeConsecutiveLinks(markdown);

  return {
    markdown,
    links,
    metaTags,
    text: markdownToText(markdown),
  };
}

export function getMetaTitle(metaTags: MetaTag[]) {
  return metaTags.find((metaTag) => metaTag.key === "og:title")?.value;
}

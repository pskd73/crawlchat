import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { removeConsecutiveLinks, markdownToText } from "./markdown";
import type { MetaTag } from "libs/prisma";
// @ts-ignore
import * as turndownPluginGfm from "turndown-plugin-gfm";

const EXCLUDE_NON_MAIN_TAGS = [
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

const SAFE_CLEAN_TAGS = ["aside"];

function cleanHtml($: cheerio.CheerioAPI) {
  for (const tag of EXCLUDE_NON_MAIN_TAGS) {
    const elem = $(tag);
    if (elem.is("html") === false && elem.is("body") === false) {
      elem.remove();
    }
  }
}

function cleanA($: cheerio.CheerioAPI) {
  $("a").each((_, a) => {
    const href = $(a).attr("href");
    if (href?.includes("?")) {
      $(a).attr("href", href.split("?")[0]);
    }
    if ($(a).text().trim().length === 0) {
      $(a).remove();
    }
  });
}

function cleanScriptStyles($: cheerio.CheerioAPI) {
  $("script").remove();
  $("style").remove();
}

function safeClean($: cheerio.CheerioAPI) {
  for (const tag of SAFE_CLEAN_TAGS) {
    const elem = $(tag);
    if (elem.is("html") === false && elem.is("body") === false) {
      elem.remove();
    }
  }
}

export type ParseLink = {
  text: string;
  href?: string;
};

export type ParseOutput = {
  markdown: string;
  links: ParseLink[];
  metaTags: MetaTag[];
  text: string;
  error?: string;
  html?: string;
};

export function parseHtml(
  html: string,
  options?: { removeHtmlTags?: string }
): ParseOutput {
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

  metaTags.push({
    key: "tag:title",
    value: $("title").text().trim(),
  });

  $("meta").remove();
  $("colgroup").remove();
  $("*").removeAttr("style");

  if ($("main").length === 0) {
    cleanHtml($);
  }
  cleanA($);
  cleanScriptStyles($);
  safeClean($);

  $("table tr:first-child td").each((_, cell) => {
    const $cell = $(cell);
    const content = $cell.html();
    const $th = $("<th></th>").html(content ?? "");
    $cell.replaceWith($th);
  });

  if (options?.removeHtmlTags) {
    const removeHtmlTags = options.removeHtmlTags.split(",");
    for (const tag of removeHtmlTags) {
      $(tag.trim()).remove();
    }
  }

  const turndownService = new TurndownService();
  turndownService.use(turndownPluginGfm.gfm);
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
  turndownService.addRule("table-cell", {
    filter: ["td"],
    replacement: function (content, node) {
      const isFirstCell =
        node.parentElement &&
        Array.from(node.parentElement.children).indexOf(node as Element) === 0;
      const cleanedContent = content.replace(/\n/g, " ");
      if (isFirstCell) {
        return `| ${cleanedContent} |`;
      }
      return ` ${cleanedContent} |`;
    },
  });
  turndownService.addRule("link-trim", {
    filter: ["a"],
    replacement: function (content, node) {
      const href = (node as HTMLElement).getAttribute("href");
      const text = content.replace(/^\n*/g, "").replace(/\n*$/g, "");
      let result = `[${text}](${href})`;
      if (content.endsWith("\n")) {
        result += "\n";
      }
      return result;
    },
  });

  let content = $("main").html() ?? $("body").html();
  if (!content) {
    content = $("body").html();
  }
  const markdown = turndownService.turndown(content ?? "");

  return {
    markdown,
    links,
    metaTags,
    text: markdownToText(markdown),
    html: content ?? undefined,
  };
}

export function getMetaTitle(metaTags: MetaTag[]) {
  const ogTitle = metaTags.find((metaTag) => metaTag.key === "og:title")?.value;
  const tagTitle = metaTags.find(
    (metaTag) => metaTag.key === "tag:title"
  )?.value;
  return ogTitle ?? tagTitle;
}

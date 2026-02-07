import { multiLinePrompt } from "@packages/agentic";
import { prisma } from "@packages/common/prisma";
import { z } from "zod";
import { randomFetchId } from "@packages/indexer";
import { CustomMessage } from "./custom-message";

const DEFAULT_SNIPPET_WINDOW = 80;
const MAX_REGEX_LENGTH = 200;
const MAX_RESULTS = 8;
const DEFAULT_MAX_CALLS = 10;
const MONGO_OBJECTID_HEX_LENGTH = 24;
const VALID_OBJECTID = /^[a-fA-F0-9]{24}$/;

function isValidMongoObjectId(value: string): boolean {
  return (
    value.length === MONGO_OBJECTID_HEX_LENGTH && VALID_OBJECTID.test(value)
  );
}

type ItemDocument = {
  _id: { $oid: string };
  markdown?: string | null;
  url?: string | null;
  score?: number;
};

function snippetAround(
  text: string | null | undefined,
  matchStart: number,
  matchLength: number,
  windowChars: number
): string | null {
  if (!text) return null;
  const start = Math.max(0, matchStart - windowChars);
  const end = Math.min(text.length, matchStart + matchLength + windowChars);
  const slice = text.slice(start, end).replace(/\s+/g, " ").trim();
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${slice}${suffix}`;
}

function snippetForPhrase(
  text: string | null | undefined,
  searchPhrase: string,
  windowChars: number
): string | null {
  if (!text || !searchPhrase) return null;
  const lower = text.toLowerCase();
  const term = searchPhrase.toLowerCase();
  const idx = lower.indexOf(term);
  if (idx === -1) return null;
  return snippetAround(text, idx, term.length, windowChars);
}

function snippetForRegex(
  text: string | null | undefined,
  regex: string,
  windowChars: number
): string | null {
  if (!text || !regex) return null;
  const re = new RegExp(regex, "i");
  const match = re.exec(text);
  if (!match) return null;
  return snippetAround(text, match.index, match[0].length, windowChars);
}

export type TextSearchToolContext = {
  textSearchToolCalls: number;
};

function checkLimitAndIncrement(context: TextSearchToolContext) {
  if (context.textSearchToolCalls >= DEFAULT_MAX_CALLS) {
    return "Fallback text search limit reached. Frame your answer from the context you have.";
  }
  context.textSearchToolCalls += 1;
}

const LARGE_SNIPPET_WINDOW_WHEN_ITEM = 300;
const MAX_SNIPPET_WINDOW_WHEN_ITEM = 1500;

function buildListAndResult(
  rawResults: ItemDocument[],
  getSnippet: (markdown: string | null) => string | null,
  getScore: (doc: ItemDocument) => number | undefined,
  query: string,
  searchType: string
): {
  list: {
    url: string;
    content: string;
    fetchUniqueId: string;
    scrapeItemId: string;
  }[];
  result: NonNullable<CustomMessage["result"]>;
} {
  const list: {
    url: string;
    content: string;
    fetchUniqueId: string;
    scrapeItemId: string;
  }[] = [];
  const result: NonNullable<CustomMessage["result"]> = [];
  for (const doc of rawResults) {
    if (!doc.markdown) continue;
    const snippet = getSnippet(doc.markdown);
    const content =
      snippet ?? doc.markdown.slice(0, 200).replace(/\s+/g, " ").trim() + "…";
    const fetchUniqueId = randomFetchId();
    list.push({
      url: doc.url ?? "",
      content,
      fetchUniqueId,
      scrapeItemId: doc._id.$oid,
    });
    const score = getScore(doc);
    result.push({
      id: doc._id.$oid,
      content,
      url: doc.url ?? undefined,
      ...(score !== undefined && { score }),
      scrapeItemId: doc._id.$oid,
      fetchUniqueId,
      query,
      searchType,
    });
  }
  return { list, result };
}

export function makeTextSearchTool(
  scrapeId: string,
  context: TextSearchToolContext
) {
  return {
    id: "text_search",
    description: multiLinePrompt([
      "Fallback phrase search over the knowledge base. Use ONLY when search_data has already been used and returned no or insufficient results.",
      "Use as small a snippetWindow as possible (default 80). Use a larger window only when you need more context around the match.",
      "Response includes totalCount and pagination; when hasMore is true, call again with page=2, page=3, etc. to fetch more.",
      "Use this tool sparingly; prefer search_data first.",
    ]),
    schema: z.object({
      searchPhrase: z.string({
        description: "Phrase to search for",
      }),
      snippetWindow: z
        .number()
        .optional()
        .describe(
          "Characters before and after the match (default 80). Use the smallest value that gives enough context; increase only when you need more."
        ),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
          "Page number (1-based). Omit for first page. Use to get more results when totalCount exceeds one page."
        ),
    }),
    execute: async ({
      searchPhrase,
      snippetWindow = DEFAULT_SNIPPET_WINDOW,
      page = 1,
    }: {
      searchPhrase: string;
      snippetWindow?: number;
      page?: number;
    }) => {
      console.log("[text_search] called with:", {
        searchPhrase,
        snippetWindow,
      });
      const limitMsg = checkLimitAndIncrement(context);
      if (limitMsg) return { content: limitMsg };

      const windowChars = Math.min(Math.max(0, snippetWindow), 500);

      const textFilter = {
        $text: { $search: searchPhrase.toLowerCase() },
        scrapeId: { $oid: scrapeId },
      };
      const countResult = (await prisma.scrapeItem.aggregateRaw({
        pipeline: [{ $match: textFilter }, { $count: "total" }],
      })) as unknown as { total: number }[] | undefined;
      const totalCount = countResult?.[0]?.total ?? 0;
      const skip = (page - 1) * MAX_RESULTS;

      const rawResults = (await prisma.scrapeItem.findRaw({
        filter: textFilter,
        options: {
          projection: {
            markdown: 1,
            url: 1,
            score: { $meta: "textScore" },
          },
          limit: MAX_RESULTS,
          skip,
        },
      })) as unknown as ItemDocument[];

      const maxScore =
        rawResults.length > 0
          ? Math.max(...rawResults.map((d) => d.score ?? 0), 0)
          : 0;
      const { list, result } = buildListAndResult(
        rawResults,
        (markdown) => snippetForPhrase(markdown, searchPhrase, windowChars),
        (doc) => (maxScore > 0 ? (doc.score ?? 0) / maxScore : 0),
        searchPhrase,
        "text_search"
      );

      const paginationInfo = {
        totalCount,
        page,
        pageSize: MAX_RESULTS,
        hasMore: skip + rawResults.length < totalCount,
      };
      const contentSuffix = `\n<pagination>${JSON.stringify(paginationInfo)}</pagination>`;
      return {
        content:
          list.length > 0
            ? `<context>\n${JSON.stringify(list)}\n</context>${contentSuffix}`
            : `No matches from text search. Do not rely on this for the answer.${contentSuffix}`,
        customMessage: { result },
      };
    },
  };
}

export function makeTextSearchRegexTool(
  scrapeId: string,
  context: TextSearchToolContext
) {
  return {
    id: "text_search_regex",
    description: multiLinePrompt([
      "Fallback regex search over the knowledge base. Use ONLY when search_data has already been used and returned no or insufficient results.",
      "Pass scrapeItemId when you know it from a previous result (context includes scrapeItemId); this narrows the search to that document.",
      "Use as small a snippetWindow as possible (default 80). Use a larger window only when you need more context; when passing scrapeItemId, increase (e.g. 200–500 or 500–1500) exactly when the snippet is insufficient.",
      "Response includes totalCount and pagination; when hasMore is true, call again with page=2, page=3, etc. to fetch more.",
      "Use this tool sparingly; prefer search_data first.",
    ]),
    schema: z.object({
      searchRegex: z
        .string()
        .max(MAX_REGEX_LENGTH)
        .describe("Regex pattern for matching (case-insensitive)"),
      scrapeItemId: z
        .string()
        .optional()
        .describe(
          "When known from prior context, pass the scrapeItemId (must be a valid MongoDB ObjectId, 24 hex characters) to search only within that document"
        ),
      snippetWindow: z
        .number()
        .optional()
        .describe(
          "Characters before and after the match (default 80, or 300 when scrapeItemId is passed). Use the smallest value that gives enough context; increase only when you need more."
        ),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
          "Page number (1-based). Omit for first page. Use to get more results when totalCount exceeds one page."
        ),
    }),
    execute: async ({
      searchRegex,
      scrapeItemId: scrapeItemIdParam,
      snippetWindow,
      page = 1,
    }: {
      searchRegex: string;
      scrapeItemId?: string;
      snippetWindow?: number;
      page?: number;
    }) => {
      const defaultWindow = scrapeItemIdParam
        ? LARGE_SNIPPET_WINDOW_WHEN_ITEM
        : DEFAULT_SNIPPET_WINDOW;
      const maxWindow = scrapeItemIdParam ? MAX_SNIPPET_WINDOW_WHEN_ITEM : 500;
      const windowChars = Math.min(
        Math.max(0, snippetWindow ?? defaultWindow),
        maxWindow
      );
      console.log("[text_search_regex] called with:", {
        searchRegex,
        scrapeItemId: scrapeItemIdParam,
        snippetWindow: snippetWindow ?? defaultWindow,
        page,
      });
      const limitMsg = checkLimitAndIncrement(context);
      if (limitMsg) return { content: limitMsg };

      if (scrapeItemIdParam && !isValidMongoObjectId(scrapeItemIdParam)) {
        return {
          content:
            "scrapeItemId must be a valid MongoDB ObjectId (24 hexadecimal characters). Use the scrapeItemId from the context JSON, not fetchUniqueId or other ids.",
        };
      }

      const regexFilter = {
        scrapeId: { $oid: scrapeId },
        markdown: { $regex: searchRegex, $options: "i" },
        ...(scrapeItemIdParam && { _id: { $oid: scrapeItemIdParam } }),
      };
      const countResult = (await prisma.scrapeItem.aggregateRaw({
        pipeline: [{ $match: regexFilter }, { $count: "total" }],
      })) as unknown as { total: number }[] | undefined;
      const totalCount = countResult?.[0]?.total ?? 0;
      const skip = (page - 1) * MAX_RESULTS;

      const rawResults = (await prisma.scrapeItem.findRaw({
        filter: regexFilter,
        options: {
          projection: { markdown: 1, url: 1 },
          limit: MAX_RESULTS,
          skip,
        },
      })) as unknown as ItemDocument[];

      const { list, result } = buildListAndResult(
        rawResults,
        (markdown) => snippetForRegex(markdown, searchRegex, windowChars),
        () => undefined,
        searchRegex,
        "text_search_regex"
      );

      const paginationInfo = {
        totalCount,
        page,
        pageSize: MAX_RESULTS,
        hasMore: skip + rawResults.length < totalCount,
      };
      const contentSuffix = `\n<pagination>${JSON.stringify(paginationInfo)}</pagination>`;
      return {
        content:
          list.length > 0
            ? `<context>\n${JSON.stringify(list)}\n</context>${contentSuffix}`
            : `No matches from text search regex. Do not rely on this for the answer.${contentSuffix}`,
        customMessage: { result },
      };
    },
  };
}

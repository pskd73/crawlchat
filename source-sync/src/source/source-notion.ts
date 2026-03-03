import { Client, ListCommentsResponse } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { GroupForSource, Source, UpdateItemResponse } from "./interface";
import { GroupData, ItemData } from "./queue";
import { scheduleUrls } from "./schedule";

function getPageTitle(page: any): string | undefined {
  if (!page.properties) {
    return undefined;
  }

  for (const key in page.properties) {
    const prop = page.properties[key];
    if (prop.type === "title" && prop.title?.length > 0) {
      return prop.title.map((t: any) => t.plain_text).join("");
    }
  }
  return undefined;
}

function getProperties(page: any): Record<string, string> {
  const properties = (page as any).properties;
  const customPropertis: Record<string, string> = {};
  for (const key in properties) {
    if (
      properties[key].type === "rich_text" &&
      properties[key].rich_text.length > 0
    ) {
      customPropertis[key] = properties[key].rich_text[0].plain_text;
    }
    if (properties[key].type === "status") {
      customPropertis[key] = properties[key].status.name;
    }
  }
  return customPropertis;
}

export async function getComments(page: any, client: Client) {
  const plainComments: {
    text: string;
    created_time: string;
  }[] = [];
  let comments: ListCommentsResponse | null = null;
  try {
    while (comments === null || comments.next_cursor) {
      comments = await client.comments.list({
        block_id: page.id,
        start_cursor: comments?.next_cursor ?? undefined,
      });
      plainComments.push(
        ...comments.results.map((comment) => ({
          text: comment.rich_text.map((t) => t.plain_text).join(""),
          created_time: comment.created_time,
        }))
      );
    }
  } catch (error: any) {
    if (error.code === "restricted_resource") {
      return [];
    }
    throw error;
  }

  return plainComments;
}

export class NotionSource implements Source {
  async updateGroup(jobData: GroupData, group: GroupForSource): Promise<void> {
    const client = new Client({
      auth: group.notionSecret as string,
    });
    const pages = await client.search({
      query: "",
      sort: {
        direction: "descending",
        timestamp: "last_edited_time",
      },
      filter: {
        property: "object",
        value: "page",
      },
    });
    const skipRegexes = (group.skipPageRegex?.split(",") ?? []).filter(Boolean);
    const filteredPages = pages.results.filter((page) => {
      return !skipRegexes.some((regex) => {
        const r = new RegExp(regex.trim());
        return r.test(page.id);
      });
    });

    await scheduleUrls(
      group,
      jobData.processId,
      filteredPages.map((page) => ({
        url: (page as any).url,
        sourcePageId: page.id,
      }))
    );
  }

  async updateItem(
    jobData: ItemData,
    group: GroupForSource
  ): Promise<UpdateItemResponse> {
    const pageId = jobData.sourcePageId;

    const client = new Client({
      auth: group.notionSecret as string,
    });

    const page = await client.pages.retrieve({
      page_id: pageId,
    });

    const n2m = new NotionToMarkdown({ notionClient: client });

    const mdblocks = await n2m.pageToMarkdown(pageId);
    const mdString = n2m.toMarkdownString(mdblocks);
    const title =
      (page as any).properties?.title?.title?.[0]?.plain_text ??
      getPageTitle(page);

    const contentParts: string[] = [];

    if (title) {
      contentParts.push(`# ${title}`);
    }

    const properties = getProperties(page);
    if (Object.keys(properties).length > 0) {
      contentParts.push(
        `<properties>\n${JSON.stringify(properties, null, 2)}\n</properties>`
      );
    }

    const comments = await getComments(page, client);
    if (comments.length > 0) {
      contentParts.push(
        `<comments>\n${JSON.stringify(comments, null, 2)}\n</comments>`
      );
    }

    contentParts.push(mdString.parent);
    const text = contentParts.filter(Boolean).join("\n\n");

    return {
      page: {
        title: title ?? "Untitled",
        text,
      },
    };
  }
}

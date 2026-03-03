import { ConfluenceClient } from "@packages/common/confluence";
import { parseHtml } from "../scrape/parse";
import { GroupForSource, Source, UpdateItemResponse } from "./interface";
import { GroupData, ItemData } from "./queue";
import { scheduleUrls } from "./schedule";

function getCursor(next?: string | null) {
  if (!next) return undefined;
  const nextUrl = new URL("https://test.com" + next);
  return nextUrl.searchParams.get("cursor") || undefined;
}

export class ConfluenceSource implements Source {
  private getClient(group: GroupForSource) {
    return new ConfluenceClient({
      host: group.confluenceHost!,
      authentication: {
        basic: {
          email: group.confluenceEmail!,
          apiToken: group.confluenceApiKey!,
        },
      },
    });
  }

  async updateGroup(jobData: GroupData, group: GroupForSource): Promise<void> {
    const client = this.getClient(group);
    const rawPages = await client.content.searchContentByCQL({
      cql: "type = 'page'",
      cursor: jobData.cursor,
    });
    const pages = rawPages.results.map((page) => ({
      id: page.id,
      title: page.title,
      url: `${group.confluenceHost!}/wiki${page._links?.tinyui}`,
    }));

    const skipRegexes = (group.skipPageRegex?.split(",") ?? []).filter(Boolean);
    const filteredPages = pages.filter((page) => {
      return !skipRegexes.some((regex) => {
        const r = new RegExp(regex.trim());
        return r.test(page.id);
      });
    });

    await scheduleUrls(
      group,
      jobData.processId,
      filteredPages.map(({ url, id }) => ({
        url,
        sourcePageId: id,
      })),
      getCursor(rawPages._links?.next)
    );
  }

  async updateItem(
    jobData: ItemData,
    group: GroupForSource
  ): Promise<UpdateItemResponse> {
    if (!jobData.sourcePageId) {
      throw new Error("Source page ID is required");
    }

    const client = this.getClient(group);
    const pageId = jobData.sourcePageId;

    const pageContent = await client.content.getContentById({
      id: pageId,
      expand: ["body.storage", "body.view", "version", "space"],
    });

    const page = await client.content.searchContentByCQL({
      cql: `id = ${pageId}`,
    });

    if (!pageContent.body?.view?.value) {
      throw new Error("Page content not found");
    }

    return {
      page: {
        text: parseHtml(pageContent.body.view.value).markdown,
        title: page.results[0].title,
      },
    };
  }
}

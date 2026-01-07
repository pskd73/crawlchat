import { GroupForSource, UpdateItemResponse, Source } from "./interface";
import { GroupData, ItemData } from "./queue";
import { LinearClient, PaginationOrderBy } from "libs/linear";
import { scheduleUrls } from "./schedule";

export class LinearProjectSource implements Source {
  private getClient(group: GroupForSource) {
    return new LinearClient({
      apiKey: group.linearApiKey!,
    });
  }

  async updateGroup(jobData: GroupData, group: GroupForSource): Promise<void> {
    const client = this.getClient(group);

    const projects = await client.projects({
      filter: {
        status: {
          id: {
            nin: group.linearSkipProjectStatuses?.split(",") ?? [],
          },
        },
      },
      orderBy: PaginationOrderBy.UpdatedAt,
      first: 10,
      after: jobData.cursor,
    });

    await scheduleUrls(
      group,
      jobData.processId,
      projects.nodes.map(({ url, id }) => ({
        url,
        sourcePageId: id,
      })),
      projects.pageInfo.endCursor
    );
  }

  async updateItem(
    jobData: ItemData,
    group: GroupForSource
  ): Promise<UpdateItemResponse> {
    const projectId = jobData.sourcePageId;
    const client = this.getClient(group);
    const result = await client.projects({
      filter: {
        id: {
          eq: projectId,
        },
      },
      first: 1,
    });
    if (result.nodes.length === 0) {
      throw new Error("Project not found");
    }
    const project = result.nodes[0];

    const updates = await project.projectUpdates();
    do {
      await updates.fetchNext();
    } while (updates.pageInfo.hasNextPage);

    const parts: string[] = [];
    parts.push(`# ${project.name}\n\n${project.description}`);
    if (project.content) {
      parts.push(project.content);
    }

    const status = await project.status;
    if (status?.name) {
      parts.push(`Status: ${status.name}`);
    }

    if (updates.nodes.length > 0) {
      parts.push(
        `### Updates\n${updates.nodes
          .map((update) => update.body)
          .join("\n\n")}`
      );
    }

    const text = parts.join("\n\n");

    return {
      page: {
        text,
        title: project.name || "Untitled",
      },
    };
  }
}


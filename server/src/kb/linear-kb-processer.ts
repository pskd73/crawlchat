import { KnowledgeGroup } from "libs/prisma";
import { BaseKbProcesser, KbProcesserListener } from "./kb-processer";
import { getLinearIssues, getLinearProjects, LinearClient } from "libs/linear";

export class LinearKbProcesser extends BaseKbProcesser {
  private readonly client: LinearClient;

  constructor(
    protected listener: KbProcesserListener,
    private readonly knowledgeGroup: KnowledgeGroup,
    protected readonly options: {
      hasCredits: () => Promise<boolean>;
      url?: string;
    }
  ) {
    super(listener, options);

    if (!this.knowledgeGroup.linearApiKey) {
      throw new Error("Linear API key is required");
    }

    this.client = new LinearClient({
      apiKey: this.knowledgeGroup.linearApiKey!,
    });
  }

  async process() {
    let issues = await getLinearIssues(
      this.client,
      this.knowledgeGroup.linearSkipIssueStatuses?.split(",") ?? []
    );

    const projects = await getLinearProjects(
      this.client,
      this.knowledgeGroup.linearSkipProjectStatuses?.split(",") ?? []
    );

    const totalPages = issues.length + projects.length;

    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      const parts: string[] = [];

      parts.push(`# ${issue.title}\n\n${issue.description}`);

      const comments = await issue.comments();
      do {
        await comments.fetchNext();
      } while (comments.pageInfo.hasNextPage);

      const commentContents = await Promise.all(
        comments.nodes.map(async (comment) => {
          return { body: comment.body, author: (await comment.user)?.name };
        })
      );

      if (commentContents.length > 0) {
        parts.push(
          `### Comments\n${commentContents
            .map((comment) => `${comment.author}: ${comment.body}`)
            .join("\n\n")}`
        );
      }

      const status = await issue.state;
      if (status?.name) {
        parts.push(`Status: ${status.name}`);
      }

      const text = parts.join("\n\n");

      this.onContentAvailable(
        issue.url,
        {
          text,
          title: issue.title || "Untitled",
        },
        {
          remaining: totalPages - i,
          completed: i,
        }
      );
    }

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
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

      this.onContentAvailable(
        project.url,
        {
          text,
          title: project.name || "Untitled",
        },
        {
          remaining: totalPages - (i + issues.length),
          completed: i + issues.length,
        }
      );
    }
  }
}

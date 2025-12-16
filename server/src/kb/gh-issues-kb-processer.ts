import { KnowledgeGroup, prisma } from "libs/prisma";
import { BaseKbProcesser, KbProcesserListener } from "./kb-processer";
import {
  getIssueMarkdown,
  getIssues,
  getIssueTimeline,
  GithubPagination,
} from "../github-api";
import { githubApiRateLimiter } from "../rate-limiter";

const ISSUES_TO_FETCH: Record<string, number> = {
  "692bb91325e4f55feefdfe82": 10000,
};

async function shouldSkipIssue(url: string, scrapeId: string) {
  const item = await prisma.scrapeItem.findFirst({
    where: {
      scrapeId,
      url,
    },
  });

  if (!item) return false;

  const h24Ago = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (
    item.status === "completed" &&
    item.createdAt &&
    item.createdAt > h24Ago
  ) {
    return true;
  }

  return false;
}

export class GithubIssuesKbProcesser extends BaseKbProcesser {
  constructor(
    protected listener: KbProcesserListener,
    private readonly knowledgeGroup: KnowledgeGroup
  ) {
    super(listener);
  }

  async shouldStop() {
    const group = await prisma.knowledgeGroup.findFirstOrThrow({
      where: { id: this.knowledgeGroup.id },
    });
    if (group.status !== "processing") {
      return true;
    }

    return false;
  }

  async process() {
    if (!this.knowledgeGroup.url) {
      throw new Error("Knowledge group URL is required");
    }

    const match = this.knowledgeGroup.url.match(
      "https://(www.)?github.com/(.+)/(.+)"
    );
    if (!match) {
      throw new Error("Invalid GitHub URL");
    }

    const [, , username, repo] = match;

    const allowedStates = this.knowledgeGroup.allowedGithubIssueStates ?? "closed";

    let addedCount = 0;
    const maxIssuesToAdd = ISSUES_TO_FETCH[this.knowledgeGroup.scrapeId] ?? 100;

    for (const state of allowedStates.split(",")) {
      if (await this.shouldStop() || addedCount >= maxIssuesToAdd) {
        break;
      }

      let pagination: GithubPagination = {};
      do {
        const { issues: newIssues, pagination: newPagination } = await getIssues({
          repo,
          username,
          state: state as "open" | "closed" | "all",
          pageUrl: pagination.nextUrl,
        });

        for (let i = 0; i < newIssues.length; i++) {
          const issue = newIssues[i];

          if (addedCount >= maxIssuesToAdd) {
            break;
          }

          if (issue.pull_request) {
            continue;
          }

          if (
            await shouldSkipIssue(issue.html_url, this.knowledgeGroup.scrapeId)
          ) {
            console.log(
              `Skipping issue ${issue.number} because it was already added`
            );
            addedCount++;
            continue;
          }

          const timeline = await getIssueTimeline({
            repo,
            username,
            issueNumber: issue.number,
          });

          await this.onContentAvailable(issue.html_url, {
            text: getIssueMarkdown(issue, timeline),
            title: issue.title,
          });

          addedCount++;

          if (await this.shouldStop()) {
            break;
          }

          await githubApiRateLimiter.wait();
        }

        if (await this.shouldStop()) {
          break;
        }

        pagination = newPagination;
        await githubApiRateLimiter.wait();
        console.log(
          `Added ${addedCount} issues, ${
            maxIssuesToAdd - addedCount
          } remaining...`
        );
      } while (addedCount < maxIssuesToAdd && pagination.nextUrl);
    }
  }
}

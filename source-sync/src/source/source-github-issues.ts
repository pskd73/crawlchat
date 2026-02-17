import {
  getIssue,
  getIssueMarkdown,
  getIssues,
  getIssueTimeline,
} from "../github-api";
import { GroupForSource, UpdateItemResponse, Source } from "./interface";
import { GroupData, ItemData } from "./queue";
import { scheduleUrls } from "./schedule";

export class GithubIssuesSource implements Source {
  async updateGroup(jobData: GroupData, group: GroupForSource): Promise<void> {
    const match = group.url!.match("https://(www.)?github.com/(.+)/(.+)");
    if (!match) {
      throw new Error("Invalid GitHub URL");
    }

    const [, , username, repo] = match;
    const allowedStates = group.allowedGithubIssueStates
      ?.split(",")
      .filter(Boolean) ?? ["closed"];
    const stateToFetch =
      allowedStates.length === 1
        ? (allowedStates[0] as "open" | "closed" | "all")
        : "all";

    const { issues, pagination } = await getIssues({
      repo,
      username,
      state: stateToFetch,
      pageUrl: jobData.cursor,
      type: group.githubIssuesType ?? "all",
    });

    await scheduleUrls(
      group,
      jobData.processId,
      issues.map(({ html_url, number }) => ({
        url: html_url,
        sourcePageId: number.toString(),
      })),
      pagination.nextUrl
    );
  }

  async updateItem(
    jobData: ItemData,
    group: GroupForSource
  ): Promise<UpdateItemResponse> {
    const match = group.url!.match("https://(www.)?github.com/(.+)/(.+)");
    if (!match) {
      throw new Error("Invalid GitHub URL");
    }
    const [, , username, repo] = match;
    const issueNumber = parseInt(jobData.sourcePageId);

    const issue = await getIssue({
      repo,
      username,
      issueNumber,
    });

    const timeline = await getIssueTimeline({
      repo,
      username,
      issueNumber,
    });

    return {
      page: {
        title: issue.title ?? "Untitled",
        text: getIssueMarkdown(issue, timeline),
      },
    };
  }
}

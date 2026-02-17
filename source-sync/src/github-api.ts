import { GithubIssuesType } from "@packages/common/prisma";

const ISSUES_PER_PAGE = 10;

type GithubIssue = {
  url: string;
  id: number;
  number: number;
  labels: string[];
  state: "open" | "closed" | "all";
  body: string;
  user: GithubUser;
  pull_request?: {
    url: string;
  };
  title?: string;
  html_url: string;
};

type GithubTimelineEvent = {
  body?: string;
  event: string;
  created_at: string;
  actor: GithubUser;
};

type GithubUser = {
  login: string;
  id: string;
};

export type GithubPagination = {
  nextUrl?: string;
  previousUrl?: string;
};

function parsePagination(headers: Headers): GithubPagination {
  const link = headers.get("link");
  const nextUrl = link?.match(/<([^<>]+)>; rel="next"/)?.[1];
  const previousUrl = link?.match(/<([^<>]+)>; rel="previous"/)?.[1];

  return { nextUrl, previousUrl };
}

export async function getIssues({
  repo,
  username,
  perPage = ISSUES_PER_PAGE,
  page = 1,
  state = "closed",
  pageUrl,
  type = "all",
}: {
  repo: string;
  username: string;
  perPage?: number;
  page?: number;
  state?: "open" | "closed" | "all";
  pageUrl?: string;
  type?: GithubIssuesType;
}): Promise<{ issues: GithubIssue[]; pagination: GithubPagination }> {
  const url =
    pageUrl ??
    `https://api.github.com/repos/${username}/${repo}/issues?per_page=${perPage}&page=${page}&state=${state}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch issues: ${response.statusText}`);
  }

  const allItems: GithubIssue[] = await response.json();
  let issues = allItems;

  if (type === "only_issues") {
    issues = issues.filter((item) => !item.pull_request);
  } else if (type === "only_prs") {
    issues = issues.filter((item) => !!item.pull_request);
  }

  return {
    issues,
    pagination: parsePagination(response.headers),
  };
}

export async function getIssue({
  repo,
  username,
  issueNumber,
}: {
  repo: string;
  username: string;
  issueNumber: number;
}): Promise<GithubIssue> {
  const response = await fetch(
    `https://api.github.com/repos/${username}/${repo}/issues/${issueNumber}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch issue: ${response.statusText}`);
  }

  return await response.json();
}

export async function getIssueTimeline({
  repo,
  username,
  issueNumber,
}: {
  repo: string;
  username: string;
  issueNumber: number;
}): Promise<GithubTimelineEvent[]> {
  const response = await fetch(
    `https://api.github.com/repos/${username}/${repo}/issues/${issueNumber}/timeline?per_page=100`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch timeline: ${response.statusText}`);
  }

  return await response.json();
}

export function getIssueMarkdown(
  issue: GithubIssue,
  timeline: GithubTimelineEvent[]
) {
  const entries: string[] = [`${issue.user.login}: ${issue.body}`];
  for (const event of timeline) {
    if (event.event === "commented" && event.body) {
      entries.push(`${event.actor.login}: ${event.body}`);
    }
  }
  return entries.join("\n---\n");
}

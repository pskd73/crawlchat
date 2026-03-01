import { Agent, Flow, multiLinePrompt } from "@packages/agentic";
import { getToken } from "./token";
import fetch from "node-fetch";
import { makeSearchTool, SearchToolContext } from "../llm/search-tool";
import { getConfig } from "../llm/config";
import z from "zod";
import {
  makeTextSearchRegexTool,
  TextSearchToolContext,
} from "../llm/text-search-tool";
import { consumeCredits } from "@packages/common/user-plan";

type GitHubPostResponse = {
  id: number;
  html_url: string;
};

export async function getPullRequestDiff(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<string> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3.diff",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get PR diff: ${error}`);
  }

  return response.text();
}

export async function postPullRequestComment(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number,
  body: string
): Promise<GitHubPostResponse> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${pullNumber}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to post PR comment: ${error}`);
  }

  return (await response.json()) as GitHubPostResponse;
}

export async function analyzeDiff(
  scrapeId: string,
  userId: string,
  diffText: string
) {
  const llmConfig = getConfig("openrouter/openai/gpt-5.1");

  const context: TextSearchToolContext & SearchToolContext = {
    queries: [],
    textSearchToolCalls: 0,
  };

  const agent = new Agent({
    id: "pr-analyzer",
    prompt: multiLinePrompt([
      "You are a helpful assistant that analyzes the diff of a PR and provides a summary of the changes.",
      "For each change, find out if there is any conflicting information in the knowledge base.",
      "Use the text_search_regex and search_data tool to find out if there is any conflicting information in the knowledge base.",
      "Use text_search_regex more so that you can find all the conflicting information in the knowledge base.",
      "The diff is given below:",

      diffText,
    ]),
    schema: z.object({
      conflicts: z
        .array(
          z.object({
            url: z
              .string()
              .describe("The conflict item URL from the knowledge base."),
            reason: z
              .string()
              .describe(
                "The reason for the conflict. It should be under 30 words."
              ),
          })
        )
        .describe("List of conflicts with the knowledge base."),
    }),
    tools: [
      makeSearchTool(scrapeId, "mars", {
        topN: 4,
        minScore: 0,
        queryContext: context,
      }),
      makeTextSearchRegexTool(scrapeId, context),
    ],
    ...llmConfig,
  });

  const flow = new Flow([agent], {
    messages: [
      {
        llmMessage: {
          role: "user",
          content: diffText,
        },
      },
    ],
  });

  flow.addNextAgents(["pr-analyzer"]);

  while (await flow.stream()) {}

  const response = JSON.parse(
    flow.getLastMessage().llmMessage.content as string
  );

  const lines = ["### Conflicts", "\n"];
  for (const conflict of response.conflicts) {
    lines.push(`- [${conflict.url}](${conflict.url}): ${conflict.reason}`);
  }
  if (response.conflicts.length === 0) {
    lines.push("_No conflicts found. All good!_");
  }
  lines.push("");

  await consumeCredits(
    userId,
    "messages",
    6,
    undefined,
    flow.getUsage().cost,
    "PR Analyzer"
  );

  return lines.join("\n");
}

export async function analyze(
  scrapeId: string,
  userId: string,
  installationId: number,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<void> {
  console.log(`Analyzing PR #${pullNumber} diff for ${owner}/${repo}`);

  const token = await getToken(installationId);
  const diffText = await getPullRequestDiff(token, owner, repo, pullNumber);

  if (!diffText.trim()) {
    console.log(`No diff found for PR #${pullNumber}`);
    return;
  }

  const analysis = await analyzeDiff(scrapeId, userId, diffText);

  await postPullRequestComment(token, owner, repo, pullNumber, analysis);
  console.log(`Posted diff analysis on PR #${pullNumber}`);
}

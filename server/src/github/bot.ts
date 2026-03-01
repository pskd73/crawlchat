import crypto from "crypto";
import { Router } from "express";
import type { Request, Response } from "express";
import { baseAnswerer, saveAnswer } from "../answer";
import { extractCitations } from "@packages/common/citation";
import { createToken } from "@packages/common/jwt";
import { consumeCredits, hasEnoughCredits } from "@packages/common/user-plan";
import { Scrape, Thread, prisma } from "@packages/common/prisma";
import { getToken } from "./token";
import { analyze } from "./pr-analyzer";

type GitHubPostResponse = {
  id: number;
  html_url: string;
};

function containsMention(text: string) {
  return Boolean(text && text.trim().startsWith("@crawlchat"));
}

function containsAnalyseTrigger(text: string) {
  return Boolean(text && /@crawlchat\s+analyse/i.test(text.trim()));
}

function cleanupMention(text: string) {
  return text.replace(/^@crawlchat/g, "").trim();
}

function verifySignature(req: Request) {
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("GitHub webhook secret not configured");
  }

  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  if (!signature) {
    throw new Error("Missing GitHub signature");
  }

  let body: Buffer | string;
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (rawBody) {
    body = rawBody;
  } else if (req.body) {
    body = JSON.stringify(req.body);
  } else {
    throw new Error("Missing request body for signature verification");
  }

  const digest = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  const expectedSignature = `sha256=${digest}`;

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  ) {
    throw new Error("Invalid GitHub signature");
  }
}

async function getThread(
  scrapeId: string,
  key: string,
  title?: string
): Promise<Thread> {
  let thread = await prisma.thread.findFirst({
    where: { scrapeId, clientThreadId: key },
  });
  if (!thread) {
    thread = await prisma.thread.create({
      data: {
        scrapeId,
        clientThreadId: key,
        title,
      },
    });
  }
  return thread;
}

async function postDiscussionComment(
  token: string,
  owner: string,
  repo: string,
  discussionNumber: number,
  body: string
): Promise<GitHubPostResponse> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/discussions/${discussionNumber}/comments`,
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
    throw new Error(`Failed to post discussion comment: ${error}`);
  }

  return (await response.json()) as GitHubPostResponse;
}

async function getIssueComments(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<any[]> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get issue comments: ${error}`);
  }

  return (await response.json()) as any[];
}

async function getDiscussionComments(
  token: string,
  owner: string,
  repo: string,
  discussionNumber: number
): Promise<any[]> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/discussions/${discussionNumber}/comments`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get discussion comments: ${error}`);
  }

  return (await response.json()) as any[];
}

async function getIssue(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<any> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get issue: ${error}`);
  }

  return (await response.json()) as any;
}

async function getDiscussion(
  token: string,
  owner: string,
  repo: string,
  discussionNumber: number
): Promise<any> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/discussions/${discussionNumber}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get discussion: ${error}`);
  }

  return (await response.json()) as any;
}

async function postIssueComment(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<GitHubPostResponse> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
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
    throw new Error(`Failed to post issue comment: ${error}`);
  }

  return (await response.json()) as GitHubPostResponse;
}

async function getGitHubConversationMessages(
  token: string,
  type: "discussion" | "issue",
  owner: string,
  repo: string,
  number: number
): Promise<
  Array<{ llmMessage: { role: "user" | "assistant"; content: string } }>
> {
  let initialBody: string;
  let comments: any[];

  if (type === "issue") {
    const issue = await getIssue(token, owner, repo, number);
    initialBody = issue.body || issue.title || "";
    comments = await getIssueComments(token, owner, repo, number);
  } else {
    const discussion = await getDiscussion(token, owner, repo, number);
    initialBody = discussion.body || discussion.title || "";
    comments = await getDiscussionComments(token, owner, repo, number);
  }

  const messages: Array<{
    llmMessage: { role: "user" | "assistant"; content: string };
  }> = [];

  if (initialBody.trim()) {
    messages.push({
      llmMessage: {
        role: "user",
        content: initialBody,
      },
    });
  }

  const allItems = [
    ...comments.map((c) => ({
      id: String(c.id),
      body: c.body || "",
      createdAt: c.created_at,
      isBot:
        c.user?.type?.toLowerCase?.() === "bot" ||
        c.user?.login?.endsWith?.("[bot]"),
    })),
  ].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const item of allItems) {
    if (!item.body.trim()) {
      continue;
    }

    messages.push({
      llmMessage: {
        role: item.isBot ? "assistant" : "user",
        content: item.body,
      },
    });
  }

  return messages.slice(-40);
}

async function answer(data: {
  scrape: Scrape;
  type: "discussion" | "issue";
  number: number;
  owner: string;
  repo: string;
  question: string;
  threadKey: string;
  title?: string;
  installationId: number;
  userId?: string;
}) {
  const { scrape } = data;

  if (!data.question.trim()) {
    return;
  }

  if (
    !(await hasEnoughCredits(scrape.userId, "messages", {
      alert: {
        scrapeId: scrape.id,
        token: createToken(scrape.userId),
      },
    }))
  ) {
    return console.warn("Insufficient credits for GitHub reply");
  }

  const thread = await getThread(scrape.id, data.threadKey, data.title);

  const questionMessage = await prisma.message.create({
    data: {
      threadId: thread.id,
      scrapeId: scrape.id,
      ownerUserId: scrape.userId,
      channel: "github_discussion",
      llmMessage: {
        role: "user",
        content: data.question,
      },
      fingerprint: data.userId?.toString(),
    },
  });

  await prisma.thread.update({
    where: { id: thread.id },
    data: { lastMessageAt: new Date() },
  });

  const actions = await prisma.apiAction.findMany({
    where: { scrapeId: scrape.id },
  });

  const prompt = scrape.githubPrompt || scrape.chatPrompt || "";

  const conversationMessages = await getGitHubConversationMessages(
    await getToken(data.installationId),
    data.type,
    data.owner,
    data.repo,
    data.number
  );

  const answer = await baseAnswerer(
    scrape,
    thread,
    data.question,
    conversationMessages,
    {
      channel: "github_discussion",
      actions,
      prompt,
    }
  );

  const newAnswerMessage = await saveAnswer(
    answer,
    scrape,
    thread.id,
    "github_discussion",
    questionMessage.id,
    data.userId?.toString()
  );

  const citation = extractCitations(answer.content, answer.sources, {
    cleanCitations: true,
    addSourcesToMessage: false,
  });

  let postResponse: GitHubPostResponse;
  if (data.type === "discussion") {
    postResponse = await postDiscussionComment(
      await getToken(data.installationId),
      data.owner,
      data.repo,
      data.number,
      citation.content
    );
  } else {
    postResponse = await postIssueComment(
      await getToken(data.installationId),
      data.owner,
      data.repo,
      data.number,
      citation.content
    );
  }

  await prisma.message.update({
    where: { id: newAnswerMessage.id },
    data: {
      githubCommentId: String(postResponse.id),
      url: postResponse.html_url,
    },
  });

  await consumeCredits(
    scrape.userId,
    "messages",
    answer.creditsUsed,
    questionMessage.id,
    answer.llmCost
  );
}

const router = Router();

router.post("/webhook", async (req: Request, res: Response) => {
  try {
    verifySignature(req);
  } catch (error) {
    console.warn("GitHub webhook signature failed:", error);
    res.status(401).json({ message: "Invalid signature" });
    return;
  }

  const event = req.headers["x-github-event"] as string | undefined;
  const payload = req.body;

  if (!event || !payload) {
    res.status(400).json({ message: "Invalid payload" });
    return;
  }

  res.json({ ok: true });
  processWebhook(event, payload);
});

async function processWebhook(event: string, payload: any) {
  const repoFullName = payload.repository.full_name;

  console.log("Processing webhook:", event, repoFullName);

  const scrape = await prisma.scrape.findFirst({
    where: { githubRepoName: repoFullName },
  });

  if (!scrape) {
    return console.error(`GitHub repo ${repoFullName} not found in CrawlChat`);
  }

  if (event === "discussion_comment" && payload.action === "created") {
    const comment = payload.comment;
    const discussion = payload.discussion;
    const repository = payload.repository;
    const installationId = payload.installation?.id;

    if (!containsMention(comment.body)) {
      return;
    }

    if (
      comment &&
      discussion &&
      repository &&
      installationId &&
      comment.user &&
      discussion.number
    ) {
      const repoFullName = repository.full_name;
      const owner = repository.owner?.login;
      const repoName = repository.name;

      if (
        repoFullName &&
        owner &&
        repoName &&
        comment.user.type?.toLowerCase?.() !== "bot" &&
        !comment.user.login?.endsWith?.("[bot]")
      ) {
        const threadKey = `${repoFullName}-discussion-${discussion.number}`;
        await answer({
          scrape,
          type: "discussion",
          number: discussion.number,
          owner,
          repo: repoName,
          question: cleanupMention(comment.body),
          userId: comment.user.id,
          threadKey,
          title: discussion.title,
          installationId,
        });
      }
    }
  }

  if (event === "issue_comment" && payload.action === "created") {
    const comment = payload.comment;
    const issue = payload.issue;
    const repository = payload.repository;
    const installationId = payload.installation?.id;

    if (
      comment &&
      issue &&
      repository &&
      installationId &&
      issue.number &&
      comment.user &&
      comment.user.type?.toLowerCase?.() !== "bot" &&
      !comment.user.login?.endsWith?.("[bot]")
    ) {
      const owner = repository.owner?.login;
      const repoName = repository.name;

      if (owner && repoName && containsAnalyseTrigger(comment.body)) {
        if (issue.pull_request) {
          await analyze(
            scrape.id,
            scrape.userId,
            installationId,
            owner,
            repoName,
            issue.number
          );
          return;
        }
      }

      if (!containsMention(comment.body)) {
        return;
      }

      const repoFullName = repository.full_name;
      if (repoFullName) {
        const threadKey = `${repoFullName}#issue-${issue.number}`;
        await answer({
          scrape,
          type: "issue",
          number: issue.number,
          owner,
          repo: repoName,
          question: cleanupMention(comment.body),
          userId: comment.user.id,
          threadKey,
          title: issue.title,
          installationId,
        });
      }
    }
  }

  if (event === "issues" && payload.action === "opened") {
    const issue = payload.issue;
    const repository = payload.repository;
    const installationId = payload.installation?.id;

    if (scrape.githubAutoReply === false) {
      return;
    }

    if (
      issue &&
      repository &&
      installationId &&
      issue.number &&
      repository.full_name &&
      issue.user &&
      issue.user.type?.toLowerCase?.() !== "bot" &&
      !issue.user.login?.endsWith?.("[bot]")
    ) {
      const repoFullName = repository.full_name;
      const owner = repository.owner?.login;
      const repoName = repository.name;
      const questionText = issue.body?.trim() || issue.title?.trim() || "";

      if (repoFullName && owner && repoName && questionText) {
        const threadKey = `${repoFullName}#issue-${issue.number}`;
        await answer({
          scrape,
          type: "issue",
          number: issue.number,
          owner,
          repo: repoName,
          question: questionText,
          userId: issue.user.id,
          threadKey,
          title: issue.title,
          installationId,
        });
      }
    }
  }
}

export default router;

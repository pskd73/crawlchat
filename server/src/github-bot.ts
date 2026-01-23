import crypto from "crypto";
import { Router } from "express";
import type { Request, Response } from "express";
import { baseAnswerer } from "./answer";
import { fillMessageAnalysis } from "./analyse-message";
import { extractCitations } from "libs/citation";
import { createToken } from "libs/jwt";
import { consumeCredits, hasEnoughCredits } from "libs/user-plan";
import { getQueryString } from "libs/llm-message";
import { MessageRating, Scrape, Thread, prisma } from "libs/prisma";
import jwt from "jsonwebtoken";

type GitHubPostResponse = {
  id: number;
  html_url: string;
};

function containsMention(text: string) {
  return Boolean(text && text.trim().startsWith("@crawlchat"));
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

async function getToken(installationId: number): Promise<string> {
  const githubAppId = process.env.GITHUB_APP_ID;
  const githubPrivateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

  if (!githubAppId || !githubPrivateKey) {
    throw new Error("GitHub app authentication not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  const iat = now - 30;
  const jwtToken = jwt.sign(
    {
      iat,
      exp: iat + 60 * 9,
      iss: githubAppId,
    },
    githubPrivateKey,
    { algorithm: "RS256" }
  );

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get installation token: ${error}`);
  }

  const data = await response.json();
  return data.token;
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

async function answer(data: {
  scrape: Scrape;
  type: "discussion" | "issue";
  number: number;
  owner: string;
  repo: string;
  question: string;
  threadKey: string;
  installationId: number;
  title?: string;
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

  const answer = await baseAnswerer(scrape, thread, data.question, [], {
    channel: "github_discussion",
    actions,
  });

  const answerMessage = await prisma.message.create({
    data: {
      threadId: thread.id,
      scrapeId: scrape.id,
      ownerUserId: scrape.userId,
      channel: "github_discussion",
      llmMessage: {
        role: "assistant",
        content: answer.content,
      },
      links: answer.sources,
      creditsUsed: answer.creditsUsed,
      questionId: questionMessage.id,
      llmModel: scrape.llmModel,
      fingerprint: data.userId?.toString(),
    },
  });

  await prisma.message.update({
    where: { id: questionMessage.id },
    data: { answerId: answerMessage.id },
  });

  await prisma.thread.update({
    where: { id: thread.id },
    data: { lastMessageAt: new Date() },
  });

  if (scrape.analyseMessage) {
    fillMessageAnalysis(
      answerMessage.id,
      questionMessage.id,
      getQueryString(data.question),
      answer.content,
      answer.context,
      {
        categories: scrape.messageCategories,
      }
    );
  }

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
    where: { id: answerMessage.id },
    data: {
      githubCommentId: String(postResponse.id),
      url: postResponse.html_url,
    },
  });

  await consumeCredits(scrape.userId, "messages", answer.creditsUsed);
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

    if (!containsMention(comment.body)) {
      return;
    }

    if (
      comment &&
      issue &&
      repository &&
      installationId &&
      issue.number &&
      comment.user
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

  if (
    event === "reaction" &&
    payload.action &&
    ["created", "deleted"].includes(payload.action)
  ) {
    const comment = payload.comment;
    const repository = payload.repository;
    const installationId = payload.installation?.id;

    if (comment && repository && installationId) {
      const repoFullName = repository.full_name;
      const owner = repository.owner?.login;
      const repoName = repository.name;

      if (repoFullName && owner && repoName) {
        const message = await prisma.message.findFirst({
          where: {
            githubCommentId: String(comment.id),
            channel: "github_discussion",
          },
        });

        if (message) {
          const isIssueComment = !!payload.issue;
          const endpoint = isIssueComment
            ? `https://api.github.com/repos/${owner}/${repoName}/issues/comments/${comment.id}/reactions?per_page=100`
            : `https://api.github.com/repos/${owner}/${repoName}/discussions/comments/${comment.id}/reactions?per_page=100`;

          const reactionsResponse = await fetch(endpoint, {
            headers: {
              Authorization: `Bearer ${await getToken(installationId)}`,
              Accept: "application/vnd.github.squirrel-girl-preview+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          });

          if (!reactionsResponse.ok) {
            throw new Error(
              `Failed to get reactions: ${await reactionsResponse.text()}`
            );
          }

          const reactions = (await reactionsResponse.json()) as any[];
          const thumbsUp = reactions.filter(
            (reaction) => reaction.content === "+1"
          ).length;
          const thumbsDown = reactions.filter(
            (reaction) => reaction.content === "-1"
          ).length;

          let rating: MessageRating = "none";
          if (thumbsDown >= thumbsUp && thumbsDown > 0) {
            rating = "down";
          } else if (thumbsUp > 0) {
            rating = "up";
          }

          await prisma.message.update({
            where: { id: message.id },
            data: {
              rating,
            },
          });
        }
      }
    }
  }
}

export default router;

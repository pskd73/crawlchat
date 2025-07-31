import dotenv from "dotenv";
dotenv.config();

import { App } from "@slack/bolt";
import { InstallationStore } from "@slack/oauth";
import { prisma } from "libs/prisma";
import { createToken } from "./jwt";
import { query } from "./api";
import { markdownToBlocks } from "@tryfabric/mack";

const LOADING_REACTION = "hourglass";

const installationStore: InstallationStore = {
  storeInstallation: async (installation) => {
    if (!installation.team) {
      throw new Error("Team not found in installation");
    }

    const scrape = await prisma.scrape.findFirst({
      where: {
        slackTeamId: installation.team.id,
      },
    });

    if (!scrape) {
      throw new Error("Scrape not configured for this team");
    }

    await prisma.scrape.update({
      where: {
        id: scrape.id,
      },
      data: {
        slackConfig: {
          installation: installation as any,
        },
      },
    });
  },
  fetchInstallation: async (installQuery) => {
    const scrape = await prisma.scrape.findFirst({
      where: {
        slackTeamId: installQuery.teamId,
      },
    });

    if (!scrape || !scrape.slackConfig) {
      throw new Error("Scrape not found or configured");
    }

    return scrape.slackConfig.installation as any;
  },
  deleteInstallation: async (installQuery) => {
    const scrape = await prisma.scrape.findFirst({
      where: {
        slackTeamId: installQuery.teamId,
      },
    });

    if (!scrape) {
      throw new Error("Scrape not found");
    }

    await prisma.scrape.update({
      where: {
        id: scrape?.id,
      },
      data: {
        slackConfig: {
          installation: undefined,
        },
        slackTeamId: undefined,
      },
    });
  },
};

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET,
  scopes: [
    "channels:history",
    "channels:read",
    "chat:write",
    "im:history",
    "im:read",
    "app_mentions:read",
    "reactions:write",
    "reactions:read",
  ],
  redirectUri: `${process.env.HOST}/oauth_redirect`,
  installationStore,
  installerOptions: {
    redirectUriPath: "/oauth_redirect",
    installPath: "/install",
  },
});

function cleanText(text: string) {
  return text.replace(/<@[^>]+>/g, "").trim();
}

type Message = {
  user?: string;
  text?: string;
};

app.message(async ({ message, say, client, context }) => {
  const scrape = await prisma.scrape.findFirst({
    where: {
      slackTeamId: context.teamId,
    },
  });

  if (!scrape) {
    await say({
      text: "You need to integrate your Slack with CrawlChat.app first!",
    });
    return;
  }

  // Check if the bot is mentioned in the message
  const messageText = (message as any).text || "";
  const botMentionPattern = new RegExp(`<@${context.botUserId}>`, "i");

  if (!botMentionPattern.test(messageText)) return;

  console.log("Bot mentioned:", context.botUserId, "in message:", messageText);

  try {
    await client.reactions.add({
      token: context.botToken,
      channel: message.channel,
      timestamp: message.ts,
      name: LOADING_REACTION,
    });
  } catch {}

  let messages: Message[] = [];

  if ((message as any).thread_ts) {
    const replies = await client.conversations.replies({
      channel: message.channel,
      ts: (message as any).thread_ts,
    });
    if (replies.messages) {
      messages = replies.messages;
    }
  } else {
    const history = await client.conversations.history({
      channel: message.channel,
      limit: 15,
    });
    if (history.messages) {
      messages = history.messages.reverse();
    }
  }

  const llmMessages = messages.map((m) => ({
    role: m.user === context.botUserId ? "assistant" : "user",
    content: cleanText(m.text ?? ""),
  }));

  const {
    answer,
    error,
    message: answerMessage,
  } = await query(scrape.id, llmMessages, createToken(scrape.userId), {
    prompt:
      "This would be a Slack message. Keep it short and concise. Use markdown for formatting.",
  });

  if (error) {
    await say({
      text: `Error: ${error}`,
    });
    return;
  }

  const sayResult = await say({
    text: answer,
    mrkdwn: true,
    thread_ts: message.ts,
    channel: message.channel,
    blocks: await markdownToBlocks(answer),
  });
  if (!sayResult.message) return;

  await prisma.message.update({
    where: {
      id: answerMessage.id,
    },
    data: {
      slackMessageId: `${sayResult.channel}|${sayResult.message.ts}`,
    },
  });

  try {
    await client.reactions.remove({
      token: context.botToken,
      channel: message.channel,
      timestamp: message.ts,
      name: LOADING_REACTION,
    });
  } catch {}
});

async function getReactionMessage(client: any, event: any) {
  const messageResult = await client.conversations.replies({
    channel: event.item.channel,
    ts: event.item.ts,
  });

  if (!messageResult.messages || messageResult.messages.length === 0) {
    return null;
  }

  return messageResult.messages[0];
}

async function rateReaction(event: any, message: any) {
  const hasThumbsUp = message.reactions?.some(
    (reaction: any) => reaction.name === "+1"
  );
  const hasThumbsDown = message.reactions?.some(
    (reaction: any) => reaction.name === "-1"
  );

  const rating = hasThumbsDown ? "down" : hasThumbsUp ? "up" : null;

  const answerMessage = await prisma.message.findFirst({
    where: {
      slackMessageId: `${event.item.channel}|${message.ts}`,
    },
  });
  if (!answerMessage) return;

  await prisma.message.update({
    where: {
      id: answerMessage.id,
    },
    data: {
      rating,
    },
  });

  console.log("Rated message", answerMessage.id, rating);
}

async function handleReaction(event: any, client: any, context: any) {
  if (event.reaction !== "+1" && event.reaction !== "-1") {
    return;
  }

  const message = await getReactionMessage(client, event);

  if (!message) {
    return;
  }

  if (message.user === context.botUserId) {
    await rateReaction(event, message);
  }
}

app.event("reaction_added", async ({ event, client, context }) => {
  await handleReaction(event, client, context);
});

app.event("reaction_removed", async ({ event, client, context }) => {
  await handleReaction(event, client, context);
});

(async () => {
  const port = process.env.PORT || 3005;
  await app.start(port);
  app.logger.info(`⚡️ Bolt app is running on port ${port}`);
})();

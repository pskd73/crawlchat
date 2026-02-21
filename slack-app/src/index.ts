if (!process.env.SLACK_SIGNING_SECRET) {
  if (!process.env.SELF_HOSTED) {
    throw new Error("SLACK_SIGNING_SECRET is not set");
  }
  console.log("SLACK_SIGNING_SECRET is not set, skipping Slack app");
  process.exit(0);
}

import { App } from "@slack/bolt";
import { InstallationStore } from "@slack/oauth";
import { prisma } from "@packages/common/prisma";
import { createToken } from "@packages/common/jwt";
import { learn, query } from "./api";

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
    "groups:history",
    "groups:read",
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

async function getContextMessages(
  message: any,
  client: any,
  botUserId: string
) {
  return [message].map((m) => ({
    role: m.user === botUserId ? "assistant" : "user",
    content: cleanText(m.text ?? ""),
  }));
}

async function getContextHistory(message: any, client: any) {
  let messages: Message[] = [];

  if ((message as any).thread_ts) {
    const replies = await client.conversations.replies({
      channel: message.channel,
      ts: (message as any).thread_ts,
    });
    if (replies.messages) {
      messages = replies.messages.filter(
        (m: any) => Number(m.ts) < Number(message.ts)
      );
    }
  } else {
    const history = await client.conversations.history({
      channel: message.channel,
      limit: 20,
      latest: message.ts,
      inclusive: false,
    });
    if (history.messages) {
      messages = history.messages;
    }
  }

  return (
    messages
      .sort((a: any, b: any) => Number(a.ts) - Number(b.ts))
      .map((m: any) => {
        const date = new Date(Number(m.ts.split(".")[0]));
        return `${m.user} (${date.toLocaleString()}): ${cleanText(m.text ?? "")}`;
      })
      .join("\n\n") || "No context available"
  );
}

async function getLearnMessages(message: any, client: any, botUserId: string) {
  let messages: Message[] = [message];

  if ((message as any).thread_ts) {
    const replies = await client.conversations.replies({
      channel: message.channel,
      ts: (message as any).thread_ts,
    });
    if (replies.messages) {
      messages = replies.messages.filter((m: any) => {
        const thisTs = new Date(Number(m.ts.split(".")[0]));
        const messageTs = new Date(Number(message.ts.split(".")[0]));
        return thisTs <= messageTs;
      });
    }
  }

  return messages.map((m) => {
    const date = new Date(Number((m as any).ts.split(".")[0]));
    return {
      role: m.user === botUserId ? "assistant" : "user",
      content: `User (${date.toLocaleString()}): ${cleanText(m.text ?? "")}`,
    };
  });
}

async function answerMessage(
  message: any,
  client: any,
  context: any,
  scrape: any,
  say: any
) {
  try {
    await client.reactions.add({
      token: context.botToken,
      channel: message.channel,
      timestamp: message.ts,
      name: LOADING_REACTION,
    });
  } catch {}

  const llmMessages = await getContextMessages(
    message,
    client,
    context.botUserId!
  );
  const history = await getContextHistory(message, client);
  const {
    answer,
    error,
    message: answerMessage,
  } = await query(scrape.id, llmMessages, createToken(scrape.userId), {
    prompt: `
This would be a Slack message.
Keep it short and concise. Don't use markdown for formatting.
Keep the format plain, if possible use the Slack blocks for formatting bold, italic, tables, links, etc.
Only following blocks are allowed:
1. Bold — *text*
2. Italic — _text_
3. Strikethrough — ~text~
4. Inline code — \`code\`
5. Code block —  code 
6. Blockquote — > text
7. List — • Item or - Item or 1. Item
8. Link — <url|label>

You should use only the above formatting in the answer.
Don't use ** or __ for bold, use * instead. This is very important. Don't use markdown.

Only answer the current tagged message and use previous messages only for context.

<message-history>
${history}
</message-history>
`,
    fingerprint: (message as any).user,
  });

  if (error) {
    try {
      await client.reactions.remove({
        token: context.botToken,
        channel: message.channel,
        timestamp: message.ts,
        name: LOADING_REACTION,
      });
    } catch {}
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
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: answer,
        },
      },
    ],
    reply_broadcast: scrape.slackConfig?.replyBroadcast ?? false,
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
}

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

  await answerMessage(message, client, context, scrape, say);
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

async function handleReaction(
  event: any,
  client: any,
  context: any,
  type: "added" | "removed",
  say: any
) {
  if (event.reaction === "+1" || event.reaction === "-1") {
    const message = await getReactionMessage(client, event);

    if (!message) {
      return;
    }

    if (message.user === context.botUserId) {
      await rateReaction(event, message);
    }
  }

  if (type === "added" && event.reaction === "jigsaw") {
    const message = await getReactionMessage(client, event);
    if (!message) return;

    const scrape = await prisma.scrape.findFirst({
      where: {
        slackTeamId: context.teamId,
      },
    });
    if (!scrape) return;

    const llmMessages = await getLearnMessages(
      { ...message, channel: event.item.channel },
      client,
      context.botUserId!
    );

    await learn(
      scrape.id,
      llmMessages.map((m) => m.content).join("\n\n"),
      createToken(scrape.userId)
    );
    try {
      await client.reactions.add({
        token: context.botToken,
        channel: event.item.channel,
        timestamp: message.ts,
        name: "white_check_mark",
      });
    } catch {}
  }

  if (type === "added" && event.reaction === "speech_balloon") {
    const message = await getReactionMessage(client, event);
    if (!message) return;

    const scrape = await prisma.scrape.findFirst({
      where: {
        slackTeamId: context.teamId,
      },
    });
    if (!scrape) return;

    await answerMessage(
      { ...message, channel: event.item.channel },
      client,
      context,
      scrape,
      say
    );
  }
}

app.event("reaction_added", async ({ event, client, context, say }) => {
  await handleReaction(event, client, context, "added", say);
});

app.event("reaction_removed", async ({ event, client, context, say }) => {
  await handleReaction(event, client, context, "removed", say);
});

(async () => {
  const port = process.env.PORT || 3005;
  await app.start(port);
  app.logger.info(`⚡️ Bolt app is running on port ${port}`);
})();

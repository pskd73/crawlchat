import dotenv from "dotenv";
dotenv.config();

import {
  ActivityType,
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  Message,
  Partials,
  PublicThreadChannel,
  TextChannel,
  ThreadAutoArchiveDuration,
} from "discord.js";
import { learn, query } from "./api";
import { createToken } from "libs/jwt";
import { MessageRating, prisma, Scrape } from "libs/prisma";

type DiscordMessage = Message<boolean>;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const allBotUserIds = process.env.ALL_BOT_USER_IDS!.split(",");

const defaultPrompt = `Keep the response very short and very concised.
It should be under 1000 charecters.`;

const fetchAllParentMessages = async (
  message: DiscordMessage,
  messages: DiscordMessage[],
  i = 0
) => {
  if (i > 10) {
    return messages;
  }

  if (!message?.reference?.messageId) {
    return messages;
  }

  const parentMessage = await message.channel.messages.fetch(
    message.reference.messageId
  );

  messages.push(parentMessage);

  return fetchAllParentMessages(parentMessage, messages, i + 1);
};

const sendTyping = async (channel: TextChannel | PublicThreadChannel) => {
  await channel.sendTyping();

  const interval = setInterval(async () => {
    await channel.sendTyping();
  }, 1000);

  return {
    stopTyping: () => {
      clearInterval(interval);
    },
  };
};

const cleanContent = (content: string) => {
  return content.replace(/\n/g, "\n\n");
};

const removeBotMentions = (content: string) => {
  return content
    .trim()
    .replace(/^<@\d+>/g, "")
    .replace(/<@\d+>$/g, "")
    .trim();
};

const getImageBase64 = async (url: string) => {
  console.log("getting image base64 for", url);
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const contentType = response.headers.get("content-type") || "image/png";
  return `data:${contentType};base64,${base64}`;
};

const makeMessage = async (message: DiscordMessage, scrape: Scrape) => {
  let content: any = cleanContent(removeBotMentions(message.content));

  if (message.embeds.length > 0) {
    for (const embed of message.embeds) {
      if (embed.title) {
        content += `\n\n${embed.title}`;
      }
      if (embed.description) {
        content += `\n\n${embed.description}`;
      }
    }
  }

  if (scrape.discordConfig?.sendImages && message.attachments.size > 0) {
    const imageUrls = [];

    for (const [_, attachment] of message.attachments) {
      if (attachment.contentType?.startsWith("image/")) {
        imageUrls.push(attachment.url);
      }
    }

    if (imageUrls.length > 0) {
      content = [
        { type: "text", text: content },
        ...(await Promise.all(
          imageUrls.map(async (url) => ({
            type: "image_url",
            image_url: { url: await getImageBase64(url) },
          }))
        )),
      ];
    }
  }

  return {
    role: message.author.id === process.env.BOT_USER_ID! ? "assistant" : "user",
    content,
  };
};

const getDiscordDetails = async (channelId: string) => {
  const scrape = await prisma.scrape.findFirst({
    where: { discordServerId: channelId },
  });

  if (!scrape) {
    return {
      scrapeId: null,
      userId: null,
    };
  }

  return {
    scrapeId: scrape.id,
    userId: scrape.userId,
    draftChannelIds: scrape.discordDraftConfig?.sourceChannelIds ?? [],
    draftEmoji: scrape.discordDraftConfig?.emoji,
    draftDestinationChannelId: scrape.discordDraftConfig?.destinationChannelId,
    scrape,
  };
};

const cleanReply = (content: string) => {
  return content.replace(/^<@\d+>/g, "").trim();
};

function getMessageRating(message: DiscordMessage): MessageRating {
  const reactions = message.reactions.cache.map((r) => r.emoji.toString());
  const thumbsUp = reactions.filter((r) =>
    ["👍", "👍🏻", "👍🏼", "👍🏽", "👍🏾", "👍🏿"].includes(r)
  ).length;
  const thumbsDown = reactions.filter((r) =>
    ["👎", "👎🏻", "👎🏼", "👎🏽", "👎🏾", "👎🏿"].includes(r)
  ).length;

  if (thumbsDown >= thumbsUp) {
    return MessageRating.down;
  }
  if (thumbsUp > 0) {
    return MessageRating.up;
  }

  return MessageRating.none;
}

async function updateMessageRating(discordMessage: DiscordMessage) {
  const message = await prisma.message.findFirst({
    where: {
      discordMessageId: discordMessage.id,
    },
  });

  if (!message) return;

  const rating = getMessageRating(discordMessage);

  await prisma.message.update({
    where: { id: message.id },
    data: { rating },
  });
}

async function learnMessage(message: DiscordMessage, includeSelf = false) {
  let messages: Array<{ author: string; content: string; createdAt: Date }> = (
    await fetchAllParentMessages(message, includeSelf ? [message] : [])
  ).map((m) => ({
    author: m.author.displayName,
    content: cleanReply(m.content),
    createdAt: m.createdAt,
  }));

  if (
    message.channel.type === ChannelType.PublicThread &&
    message.channel.parent?.id
  ) {
    messages = (await message.channel.messages.fetch())
      .filter((m) => includeSelf || m.id !== message.id)
      .filter((m) => m.content.length > 0)
      .map((m) => ({
        author: m.author.displayName,
        content: cleanReply(m.content),
        createdAt: m.createdAt,
      }));

    const parentMessage = await message.channel.fetchStarterMessage();
    if (
      parentMessage &&
      !messages.some((m) => m.content === cleanReply(parentMessage.content))
    ) {
      messages.push({
        author: parentMessage.author.displayName,
        content: cleanReply(parentMessage.content),
        createdAt: parentMessage.createdAt,
      });
    }
  }

  let content = messages
    .map((m) => `${m.author} (${m.createdAt.toLocaleString()}): ${m.content}`)
    .reverse()
    .map(cleanContent)
    .join("\n\n");

  const { scrapeId, userId } = await getDiscordDetails(message.guildId!);

  if (!scrapeId || !userId) {
    message.reply("‼️ Integrate it on CrawlChat.app to use this bot!");
    return;
  }

  console.log("Learning", { content, scrapeId, userId });

  await learn(scrapeId, content, createToken(userId));

  message.react("✅");
}

async function getPreviousMessages(message: DiscordMessage) {
  if (message.channel.type === ChannelType.PublicThread) {
    const threadChannel = message.channel as PublicThreadChannel;
    const messages = (
      await threadChannel.messages.fetch({
        limit: 20,
        before: message.id,
      })
    ).map((m) => m);
    return messages;
  }

  const messages = (
    await message.channel.messages.fetch({
      limit: 20,
      before: message.id,
    })
  )
    .filter((m) => m.channel.type !== ChannelType.PublicThread)
    .map((m) => m);

  return messages;
}

async function isMessageFromChannels(
  message: DiscordMessage,
  channelNames: string[]
) {
  if (message.channel.type === ChannelType.GuildText) {
    const textChannel = message.channel as TextChannel;
    return channelNames.includes(textChannel.name);
  }

  if (message.channel.type === ChannelType.PublicThread) {
    const threadChannel = message.channel as PublicThreadChannel;
    const parentChannel = threadChannel.parent;

    if (parentChannel && parentChannel.type === ChannelType.GuildText) {
      const textParentChannel = parentChannel as TextChannel;
      return channelNames.includes(textParentChannel.name);
    }
  }

  return false;
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (
    (message.mentions.users.has(process.env.BOT_USER_ID!) ||
      message.content.includes("<@&1409463850805231740>")) && // for Postiz
    message.author.id !== process.env.BOT_USER_ID!
  ) {
    const { scrape } = await getDiscordDetails(message.guildId!);

    if (!scrape) {
      message.reply("‼️ Integrate it on CrawlChat.app to use this bot!");
      return;
    }

    if (
      scrape.discordConfig?.onlyChannelNames &&
      !(await isMessageFromChannels(
        message,
        scrape.discordConfig.onlyChannelNames.split(",")
      ))
    ) {
      return;
    }

    const { stopTyping } = await sendTyping(message.channel as TextChannel);

    const previousMessages = await getPreviousMessages(message);
    const replyMessages = await fetchAllParentMessages(message, []);

    const contextMessages = [...previousMessages, ...replyMessages].sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp
    );

    const messages = await Promise.all(
      contextMessages.map((m) => makeMessage(m, scrape))
    );

    messages.push(await makeMessage(message, scrape));

    let response = "Something went wrong";
    let discordThread = null;

    if (
      scrape.discordConfig?.replyAsThread &&
      message.channel.type !== ChannelType.PublicThread
    ) {
      const shortQuery = cleanContent(
        removeBotMentions(message.content)
      ).substring(0, 50);
      discordThread = await message.startThread({
        name: `Response to: ${shortQuery}${
          shortQuery.length > 50 ? "..." : ""
        }`,
        autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays,
      });
    }

    const {
      answer,
      error,
      message: answerMessage,
    } = await query(scrape.id, messages, createToken(scrape.userId), {
      prompt: defaultPrompt,
      clientThreadId: discordThread?.id,
    });

    if (error) {
      response = `‼️ Attention required: ${error}`;
    }
    if (answer) {
      response = answer;
    }

    stopTyping();

    let replyResult;

    if (discordThread) {
      replyResult = await discordThread.send(response);
    } else {
      replyResult = await message.reply(response);
    }

    await prisma.message.update({
      where: { id: answerMessage.id },
      data: {
        discordMessageId: replyResult.id,
      },
    });
  } else if (
    message.channel.type === ChannelType.PublicThread &&
    message.channel.parent?.id &&
    !allBotUserIds.includes(message.author.id)
  ) {
    const { scrapeId, userId, draftDestinationChannelId } =
      await getDiscordDetails(message.guildId!);

    const scrape = await prisma.scrape.findFirst({
      where: { id: scrapeId! },
    });

    if (!scrape) {
      message.reply("‼️ Integrate it on CrawlChat.app to use this bot!");
      return;
    }

    if (message.channel.parent.id === draftDestinationChannelId) {
      const { stopTyping } = await sendTyping(message.channel);

      const messages = await message.channel.messages.fetch();
      const llmMessages = (
        await Promise.all(messages.map((m) => makeMessage(m, scrape)))
      ).reverse();

      const { answer, error } = await query(
        scrapeId,
        llmMessages,
        createToken(userId),
        {
          prompt: defaultPrompt,
        }
      );

      if (error) {
        stopTyping();
        message.channel.send(
          `‼️ Attention required: ${error}. Please contact the support team.`
        );
        return;
      }

      message.channel.send(answer);

      stopTyping();
    }
  }
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("Something went wrong when fetching the message:", error);
      return;
    }
  }

  const { scrapeId, userId, draftEmoji, draftDestinationChannelId } =
    await getDiscordDetails(reaction.message.guildId!);

  if (!scrapeId || !userId) {
    reaction.message.reply("‼️ Integrate it on CrawlChat.app to use this bot!");
    return;
  }

  const scrape = await prisma.scrape.findFirst({
    where: { id: scrapeId! },
  });

  if (!scrape) {
    reaction.message.reply("‼️ Integrate it on CrawlChat.app to use this bot!");
    return;
  }

  await updateMessageRating(await reaction.message.fetch());

  const emojiStr = reaction.emoji.toString();

  if (emojiStr === "🧩") {
    return learnMessage(await reaction.message.fetch(), true);
  }

  if (emojiStr === draftEmoji && draftDestinationChannelId) {
    const channel = await reaction.message.client.channels.fetch(
      draftDestinationChannelId
    );

    if (channel && channel.isThreadOnly()) {
      const { answer, error } = await query(
        scrapeId,
        [await makeMessage(await reaction.message.fetch(), scrape)],
        createToken(userId),
        {
          prompt: defaultPrompt,
        }
      );

      if (error) {
        reaction.message.reply(
          `‼️ Attention required: ${error}. Please contact the support team.`
        );
        return;
      }

      let threadName = `${emojiStr}`;
      if (reaction.message.channel.isThread()) {
        threadName = `${threadName} ${reaction.message.channel.name}`;
      }

      const thread = await channel.threads.create({
        name: threadName,
        message: {
          content: `Original message: ${reaction.message.url}
  Question: ${reaction.message.content}`,
        },
      });

      thread.send(answer);
    }
  }
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("Something went wrong when fetching the message:", error);
      return;
    }
  }

  const { scrapeId, userId } = await getDiscordDetails(
    reaction.message.guildId!
  );

  if (!scrapeId || !userId) {
    reaction.message.reply("‼️ Integrate it on CrawlChat.app to use this bot!");
    return;
  }

  await updateMessageRating(await reaction.message.fetch());
});

client.on(Events.ClientReady, async () => {
  console.log("Client ready");
  if (process.env.BOT_STATUS) {
    client.user?.setActivity({
      type: ActivityType.Custom,
      state: process.env.BOT_STATUS,
      name: process.env.BOT_STATUS,
    });
  }
});

client.login(process.env.DISCORD_TOKEN);

import dotenv from "dotenv";
dotenv.config();

import {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  Message,
  Partials,
  PublicThreadChannel,
  TextChannel,
} from "discord.js";
import { learn, query } from "./api";
import { createToken } from "./jwt";
import { MessageRating, prisma } from "libs/prisma";

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
  };
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

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.mentions.users.has(process.env.BOT_USER_ID!)) {
    if (message.content === "learn") {
      let messages: Array<{ author: string; content: string }> = (
        await fetchAllParentMessages(message, [])
      ).map((m) => ({ author: m.author.displayName, content: m.content }));

      if (
        message.channel.type === ChannelType.PublicThread &&
        message.channel.parent?.id
      ) {
        messages = (await message.channel.messages.fetch())
          .filter((m) => m.id !== message.id)
          .map((m) => ({
            author: m.author.displayName,
            content: m.content,
          }));
      }

      let content = messages
        .map((m) => `${m.author}: ${m.content}`)
        .reverse()
        .map(cleanContent)
        .join("\n---\n");

      const { scrapeId, userId } = await getDiscordDetails(message.guildId!);

      if (!scrapeId || !userId) {
        message.reply("‼️ Integrate it on CrawlChat.app to use this bot!");
        return;
      }

      console.log("Learning", { content, scrapeId, userId });

      await learn(scrapeId, content, createToken(userId));

      message.react("✅");
      return;
    }

    const { scrapeId, userId } = await getDiscordDetails(message.guildId!);

    if (!scrapeId || !userId) {
      message.reply("‼️ Integrate it on CrawlChat.app to use this bot!");
      return;
    }

    let rawQuery = message.content;
    rawQuery = rawQuery.replace(/^<@\d+> /, "").trim();

    const previousMessages = (
      await message.channel.messages.fetch({
        limit: 20,
        before: message.id,
      })
    ).map((m) => m);
    const replyMessages = await fetchAllParentMessages(message, []);

    const contextMessages = [...previousMessages, ...replyMessages].sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp
    );

    const messages = contextMessages.map((m) => ({
      role: m.author.id === process.env.BOT_USER_ID! ? "assistant" : "user",
      content: cleanContent(m.content),
    }));

    messages.push({
      role: "user",
      content: cleanContent(rawQuery),
    });

    const { stopTyping } = await sendTyping(message.channel as TextChannel);

    let response = "Something went wrong";
    const {
      answer,
      error,
      message: answerMessage,
    } = await query(scrapeId, messages, createToken(userId), {
      prompt: defaultPrompt,
    });

    if (error) {
      response = `‼️ Attention required: ${error}`;
    }
    if (answer) {
      response = answer;
    }

    stopTyping();

    const replyResult = await message.reply(response);

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
    if (message.channel.parent.id === draftDestinationChannelId) {
      const { stopTyping } = await sendTyping(message.channel);

      const messages = await message.channel.messages.fetch();
      const llmMessages = messages
        .map((m) => ({
          role: m.author.id === process.env.BOT_USER_ID! ? "assistant" : "user",
          content: cleanContent(m.content),
        }))
        .reverse();

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

  await updateMessageRating(await reaction.message.fetch());

  const emojiStr = reaction.emoji.toString();

  if (emojiStr !== draftEmoji || !draftDestinationChannelId) {
    return;
  }

  const channel = await reaction.message.client.channels.fetch(
    draftDestinationChannelId
  );

  if (channel && channel.isThreadOnly()) {
    const { answer, error } = await query(
      scrapeId,
      [
        {
          role: "user",
          content: reaction.message.content!,
        },
      ],
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

client.login(process.env.DISCORD_TOKEN);

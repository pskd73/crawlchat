import dotenv from "dotenv";
dotenv.config();

import {
  Client,
  Events,
  GatewayIntentBits,
  Message,
  Snowflake,
  TextChannel,
} from "discord.js";
import { getDiscordDetails, learn, query } from "./api";
import { createToken } from "./jwt";

type DiscordMessage = Message<boolean>;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessages,
  ],
});

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

const sendTyping = async (channel: TextChannel) => {
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

const discordPrompt = (query: string) => {
  return `Query: ${query}
Keep the response very short and very concised.
It should be under 1000 charecters.`;
};

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.mentions.users.has(process.env.BOT_USER_ID!)) {
    if (message.content.includes("learn")) {
      const messages = await fetchAllParentMessages(message, []);

      const content = messages
        .map((m) => m.content)
        .reverse()
        .map(cleanContent)
        .join("\n\n");

      const { scrapeId, userId } = await getDiscordDetails(message.guildId!);

      await learn(scrapeId, content, createToken(userId));

      message.reply("Added to collection!");
      return;
    }

    const { scrapeId, userId } = await getDiscordDetails(message.guildId!);

    if (!scrapeId || !userId) {
      message.reply("‼️ Integrate it on CrawlChat.app to use this bot!");
      return;
    }

    let rawQuery = message.content;
    rawQuery = rawQuery.replace(/^<@\d+> /, "").trim();

    const messages = (await fetchAllParentMessages(message, []))
      .reverse()
      .map((m) => ({
        role: m.author.id === process.env.BOT_USER_ID! ? "assistant" : "user",
        content: cleanContent(m.content),
      }));

    messages.push({
      role: "user",
      content: discordPrompt(cleanContent(rawQuery)),
    });

    const { stopTyping } = await sendTyping(message.channel as TextChannel);

    let response = "Something went wrong";
    const { answer, error } = await query(
      scrapeId,
      messages,
      createToken(userId)
    );

    if (error) {
      response = `‼️ Attention required: ${error}`;
    }
    if (answer) {
      response = answer;
    }

    stopTyping();

    message.reply(response);
  }
});

client.login(process.env.DISCORD_TOKEN);

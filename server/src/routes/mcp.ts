import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Prisma, prisma } from "@packages/common/prisma";
import { getCollectionSummary } from "@packages/common/summary";
import { Request, Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const router = Router();

type ApiUser = Prisma.UserGetPayload<{
  include: {
    scrapeUsers: true;
  };
}>;

const sessions = new Map<
  string,
  {
    transport: SSEServerTransport;
    user: ApiUser;
    server: McpServer;
  }
>();

const streamableSessions = new Map<
  string,
  {
    transport: StreamableHTTPServerTransport;
    user: ApiUser;
    server: McpServer;
  }
>();

async function getApiUser(apiKey: string | undefined) {
  if (!apiKey) {
    return null;
  }

  const apiKeyRecord = await prisma.apiKey.findFirst({
    where: { key: apiKey },
    include: {
      user: {
        include: {
          scrapeUsers: true,
        },
      },
    },
  });

  return apiKeyRecord?.user ?? null;
}

function getHeaderValue(header: string | string[] | undefined) {
  if (typeof header === "string") {
    return header;
  }
  if (Array.isArray(header)) {
    return header[0];
  }
  return undefined;
}

async function getRequestUser(req: Request) {
  return getApiUser(getHeaderValue(req.headers["x-api-key"]));
}

function ensureScrapeAccess(user: ApiUser, scrapeId: string) {
  if (
    !user.scrapeUsers.find((scrapeUser) => scrapeUser.scrapeId === scrapeId)
  ) {
    throw new Error("Unauthorised");
  }
}

function createMcpServer(user: ApiUser) {
  const server = new McpServer({
    name: "crawlchat",
    version: "1.0.0",
  });
  const mcpServer: any = server;

  mcpServer.tool("get_user", async () => {
    return {
      content: [{ type: "text", text: JSON.stringify({ user }) }],
    };
  });

  mcpServer.tool("get_collections", async () => {
    const memberships = await prisma.scrapeUser.findMany({
      where: {
        userId: user.id,
      },
      include: {
        scrape: true,
      },
    });

    const collections = memberships.map((membership) => ({
      title: membership.scrape.title,
      id: membership.scrape.id,
      createdAt: membership.scrape.createdAt,
      llmModel: membership.scrape.llmModel,
      slug: membership.scrape.slug,
      logoUrl: membership.scrape.logoUrl,
      ticketingEnabled: membership.scrape.ticketingEnabled,
      discordServerId: membership.scrape.discordServerId,
      discordDraftConfig: membership.scrape.discordDraftConfig,
      slackTeamId: membership.scrape.slackTeamId,
      private: membership.scrape.private,
      categories: membership.scrape.messageCategories,
      chatPrompt: membership.scrape.chatPrompt,
      showSources: membership.scrape.showSources,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(collections) }],
    };
  });

  mcpServer.tool(
    "get_groups",
    {
      scrapeId: z.string().describe("The ID of the collection."),
    },
    async ({ scrapeId }: { scrapeId: string }) => {
      ensureScrapeAccess(user, scrapeId);

      const groups = await prisma.knowledgeGroup.findMany({
        where: { scrapeId },
        include: {
          scrapeItems: true,
        },
      });

      const response = groups.map((group) => ({
        id: group.id,
        title: group.title,
        type: group.type,
        createdAt: group.createdAt,
        status: group.status,
        items: group.scrapeItems.length,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(response) }],
      };
    }
  );

  mcpServer.tool(
    "get_data_gaps",
    {
      scrapeId: z.string().describe("The ID of the collection."),
    },
    async ({ scrapeId }: { scrapeId: string }) => {
      ensureScrapeAccess(user, scrapeId);
      const oneWeekAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
      const dataGaps = await prisma.message.findMany({
        where: {
          scrapeId,
          AND: [
            {
              analysis: {
                isNot: {
                  dataGapTitle: null,
                },
              },
            },
            {
              analysis: {
                isNot: {
                  dataGapDone: true,
                },
              },
            },
          ],
          createdAt: {
            gte: oneWeekAgo,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        content: [{ type: "text", text: JSON.stringify(dataGaps) }],
      };
    }
  );

  mcpServer.tool(
    "get_messages",
    {
      scrapeId: z.string().describe("The ID of the collection."),
      page: z.number().int().min(1).optional(),
    },
    async ({ scrapeId, page }: { scrapeId: string; page?: number }) => {
      ensureScrapeAccess(user, scrapeId);
      const pageNumber = page ?? 1;
      const pageSize = 50;
      const oneWeekAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

      const totalMessages = await prisma.message.count({
        where: {
          scrapeId,
          createdAt: {
            gte: oneWeekAgo,
          },
        },
      });

      const messages = await prisma.message.findMany({
        where: {
          scrapeId,
          createdAt: {
            gte: oneWeekAgo,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      });

      const response = {
        messages: messages.map((message) => ({
          id: message.id,
          createdAt: message.createdAt,
          content: (message.llmMessage as any)?.content,
          role: (message.llmMessage as any)?.role,
          channel: message.channel,
          attachments: message.attachments,
          links: message.links,
        })),
        total: totalMessages,
        page: pageNumber,
        pageSize,
        totalPages: Math.ceil(totalMessages / pageSize),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(response) }],
      };
    }
  );

  mcpServer.tool(
    "get_summary",
    {
      scrapeId: z.string().describe("The ID of the collection."),
      fromTime: z.string().describe("Start time in ISO 8601 format."),
      endTime: z.string().describe("End time in ISO 8601 format."),
    },
    async ({
      scrapeId,
      fromTime,
      endTime,
    }: {
      scrapeId: string;
      fromTime: string;
      endTime: string;
    }) => {
      ensureScrapeAccess(user, scrapeId);

      const fromDate = new Date(fromTime);
      const endDate = new Date(endTime);
      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(endDate.getTime())) {
        throw new Error("Invalid fromTime or endTime");
      }
      if (fromDate > endDate) {
        throw new Error("fromTime should be before endTime");
      }

      const summary = await getCollectionSummary({
        scrapeId,
        fromTime: fromDate,
        endTime: endDate,
      });

      const response = {
        scrapeId,
        scrape: summary.scrape,
        fromTime,
        endTime,
        nScrapeItems: summary.nScrapeItems,
        messagesSummary: summary.messagesSummary,
        categoriesSummary: summary.categoriesSummary,
        topItems: summary.topItems,
        uniqueUsers: summary.uniqueUsers,
        uniqueUsersCount: summary.uniqueUsersCount,
        topGroupsCited: summary.topGroupsCited,
        avgUserLifetime: summary.avgUserLifetime,
        avgQuestionsPerUser: summary.avgQuestionsPerUser,
        timeSaved: summary.timeSaved,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(response) }],
      };
    }
  );

  mcpServer.tool(
    "set_ai_model",
    {
      scrapeId: z.string().describe("The ID of the collection."),
      aiModel: z.string().min(1),
    },
    async ({ scrapeId, aiModel }: { scrapeId: string; aiModel: string }) => {
      ensureScrapeAccess(user, scrapeId);
      await prisma.scrape.update({
        where: { id: scrapeId },
        data: { llmModel: aiModel },
      });
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true }) }],
      };
    }
  );

  mcpServer.tool(
    "set_collection_visibility",
    {
      scrapeId: z.string().describe("The ID of the collection."),
      private: z.boolean(),
    },
    async ({
      scrapeId,
      private: isPrivate,
    }: {
      scrapeId: string;
      private: boolean;
    }) => {
      ensureScrapeAccess(user, scrapeId);
      await prisma.scrape.update({
        where: { id: scrapeId },
        data: { private: isPrivate },
      });
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true }) }],
      };
    }
  );

  mcpServer.tool(
    "set_prompt",
    {
      scrapeId: z.string().describe("The ID of the collection."),
      prompt: z.string(),
    },
    async ({ scrapeId, prompt }: { scrapeId: string; prompt: string }) => {
      ensureScrapeAccess(user, scrapeId);
      await prisma.scrape.update({
        where: { id: scrapeId },
        data: { chatPrompt: prompt },
      });
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true }) }],
      };
    }
  );

  mcpServer.tool(
    "set_show_sources",
    {
      scrapeId: z.string().describe("The ID of the collection."),
      showSources: z.boolean(),
    },
    async ({
      scrapeId,
      showSources,
    }: {
      scrapeId: string;
      showSources: boolean;
    }) => {
      ensureScrapeAccess(user, scrapeId);
      await prisma.scrape.update({
        where: { id: scrapeId },
        data: { showSources },
      });
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true }) }],
      };
    }
  );

  return server;
}

router.get("/sse", async (req, res) => {
  const user = await getRequestUser(req);

  if (!user) {
    res.status(401).json({ error: "Invalid authorization" });
    return;
  }

  const transport = new SSEServerTransport("/mcp/messages", res);
  const server = createMcpServer(user);

  sessions.set(transport.sessionId, {
    transport,
    user,
    server,
  });

  res.on("close", () => {
    sessions.delete(transport.sessionId);
  });

  await server.connect(transport);
});

router.post("/messages", async (req, res) => {
  const user = await getRequestUser(req);

  if (!user) {
    res.status(401).json({ error: "Invalid authorization" });
    return;
  }

  const sessionId = req.query.sessionId;
  if (!sessionId || typeof sessionId !== "string") {
    res.status(400).json({ error: "Missing sessionId" });
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.user.id !== user.id) {
    res.status(401).json({ error: "Invalid authorization" });
    return;
  }

  await session.transport.handlePostMessage(req, res, req.body);
});

router.all("/", async (req, res) => {
  const user = await getRequestUser(req);

  if (!user) {
    res.status(401).json({ error: "Invalid authorization" });
    return;
  }

  const sessionId = getHeaderValue(req.headers["mcp-session-id"]);
  if (sessionId) {
    const session = streamableSessions.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    if (session.user.id !== user.id) {
      res.status(401).json({ error: "Invalid authorization" });
      return;
    }
    await session.transport.handleRequest(req, res, req.body);
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: randomUUID,
    onsessioninitialized: (newSessionId) => {
      streamableSessions.set(newSessionId, {
        transport,
        user,
        server,
      });
    },
    onsessionclosed: (closedSessionId) => {
      streamableSessions.delete(closedSessionId);
    },
  });
  const server = createMcpServer(user);
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  if (!transport.sessionId) {
    await transport.close();
  }
});

export default router;

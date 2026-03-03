import {
  authenticate,
  authoriseScrapeUser,
} from "@packages/common/express-auth";
import { prisma } from "@packages/common/prisma";
import { Router } from "express";

const router = Router();

router.get("/user", authenticate, async (req, res) => {
  res.json({ user: req.user });
});

router.get("/collections", authenticate, async (req, res) => {
  const memberships = await prisma.scrapeUser.findMany({
    where: {
      userId: req.user!.id,
    },
    include: {
      scrape: true,
    },
  });
  res.json(
    memberships.map((m) => ({
      title: m.scrape.title,
      id: m.scrape.id,
      createdAt: m.scrape.createdAt,
      llmModel: m.scrape.llmModel,
      slug: m.scrape.slug,
      logoUrl: m.scrape.logoUrl,
      ticketingEnabled: m.scrape.ticketingEnabled,
      discordServerId: m.scrape.discordServerId,
      discordDraftConfig: m.scrape.discordDraftConfig,
      slackTeamId: m.scrape.slackTeamId,
      private: m.scrape.private,
      categories: m.scrape.messageCategories,
      chatPrompt: m.scrape.chatPrompt,
      showSources: m.scrape.showSources,
    }))
  );
});

router.get("/groups", authenticate, async (req, res) => {
  const scrapeId = req.query.scrapeId as string;

  authoriseScrapeUser(req.user!.scrapeUsers, scrapeId, res);

  const groups = await prisma.knowledgeGroup.findMany({
    where: { scrapeId },
    include: {
      scrapeItems: true,
    },
  });
  res.json(
    groups.map((g) => ({
      id: g.id,
      title: g.title,
      type: g.type,
      createdAt: g.createdAt,
      status: g.status,
      items: g.scrapeItems.length,
    }))
  );
});

router.get("/data-gaps", authenticate, async (req, res) => {
  const scrapeId = req.query.scrapeId as string;

  authoriseScrapeUser(req.user!.scrapeUsers, scrapeId, res);

  const ONE_WEEK_AGO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

  const messages = await prisma.message.findMany({
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
        gte: ONE_WEEK_AGO,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  res.json(messages);
});

router.get("/messages", authenticate, async (req, res) => {
  const scrapeId = req.query.scrapeId as string;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = 50;

  authoriseScrapeUser(req.user!.scrapeUsers, scrapeId, res);

  const ONE_WEEK_AGO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

  const totalMessages = await prisma.message.count({
    where: {
      scrapeId,
      createdAt: {
        gte: ONE_WEEK_AGO,
      },
    },
  });

  const messages = await prisma.message.findMany({
    where: {
      scrapeId,
      createdAt: {
        gte: ONE_WEEK_AGO,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  res.json({
    messages: messages.map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      content: (m.llmMessage as any)?.content,
      role: (m.llmMessage as any)?.role,
      channel: m.channel,
      attachments: m.attachments,
      links: m.links,
    })),
    total: totalMessages,
    page,
    pageSize,
    totalPages: Math.ceil(totalMessages / pageSize),
  });
});

router.post("/collection/ai-model", authenticate, async (req, res) => {
  const scrapeId = req.body.scrapeId as string;
  const aiModel = req.body.aiModel as string;

  if (!aiModel) {
    res.status(400).json({ message: "AI model is required" });
    return;
  }

  authoriseScrapeUser(req.user!.scrapeUsers, scrapeId, res);

  await prisma.scrape.update({
    where: { id: scrapeId },
    data: { llmModel: aiModel },
  });

  res.json({ success: true });
});

router.post("/collection/visibility", authenticate, async (req, res) => {
  const scrapeId = req.body.scrapeId as string;
  const isPrivate = req.body.private as boolean;

  authoriseScrapeUser(req.user!.scrapeUsers, scrapeId, res);

  await prisma.scrape.update({
    where: { id: scrapeId },
    data: { private: isPrivate },
  });

  res.json({ success: true });
});

router.post("/collection/prompt", authenticate, async (req, res) => {
  const scrapeId = req.body.scrapeId as string;
  const prompt = req.body.prompt as string;

  authoriseScrapeUser(req.user!.scrapeUsers, scrapeId, res);

  await prisma.scrape.update({
    where: { id: scrapeId },
    data: { chatPrompt: prompt },
  });

  res.json({ success: true });
});

router.post("/collection/show-sources", authenticate, async (req, res) => {
  const scrapeId = req.body.scrapeId as string;
  const showSources = req.body.showSources as boolean;

  authoriseScrapeUser(req.user!.scrapeUsers, scrapeId, res);

  await prisma.scrape.update({
    where: { id: scrapeId },
    data: { showSources },
  });

  res.json({ success: true });
});

export default router;

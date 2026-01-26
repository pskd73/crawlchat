import express from "express";
import cors from "cors";
import type { Express, Request, Response } from "express";
import {
  authenticate,
  AuthMode,
  authoriseScrapeUser,
} from "@packages/common/express-auth";
import "./worker";
import { Prisma, prisma } from "@packages/common/prisma";
import { v4 as uuidv4 } from "uuid";
import {
  getPendingUrls,
  scheduleGroup,
  scheduleUrl,
  scheduleUrls,
} from "./source/schedule";
import memoryRoutes from "./memory/routes";

declare global {
  namespace Express {
    interface Request {
      user?: Prisma.UserGetPayload<{
        include: {
          scrapeUsers: true;
        };
      }>;
      authMode?: AuthMode;
    }
  }
}

const app: Express = express();
const PORT = process.env.PORT || 3007;

app.use(express.json());
app.use(cors());

app.use("/memory", memoryRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post(
  "/update-group",
  authenticate,
  async function (req: Request, res: Response) {
    const knowledgeGroup = await prisma.knowledgeGroup.findFirstOrThrow({
      where: { id: req.body.knowledgeGroupId },
      include: {
        scrape: {
          include: {
            user: true,
          },
        },
      },
    });

    authoriseScrapeUser(req.user!.scrapeUsers, knowledgeGroup.scrapeId, res);

    const processId = uuidv4();

    await prisma.knowledgeGroup.update({
      where: { id: knowledgeGroup.id },
      data: { updateProcessId: processId, status: "processing" },
    });

    await scheduleGroup(knowledgeGroup, processId);

    res.json({ message: "ok" });
  }
);

app.post(
  "/update-item",
  authenticate,
  async function (req: Request, res: Response) {
    const scrapeItem = await prisma.scrapeItem.findFirstOrThrow({
      where: { id: req.body.scrapeItemId },
      include: {
        knowledgeGroup: {
          include: {
            scrape: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    authoriseScrapeUser(req.user!.scrapeUsers, scrapeItem.scrapeId, res);

    if (!scrapeItem.url) {
      return res.status(400).json({ message: "Item has no url" });
    }

    const processId = uuidv4();

    await prisma.knowledgeGroup.update({
      where: { id: scrapeItem.knowledgeGroupId },
      data: { updateProcessId: processId },
    });

    if (!scrapeItem.sourcePageId) {
      return res.status(400).json({ message: "Item has no source page id" });
    }

    await scheduleUrl(
      scrapeItem.knowledgeGroup!,
      processId,
      scrapeItem.url,
      scrapeItem.sourcePageId,
      { justThis: true }
    );

    res.json({ message: "ok" });
  }
);

app.post(
  "/stop-group",
  authenticate,
  async function (req: Request, res: Response) {
    const scrapeItem = await prisma.scrapeItem.findFirstOrThrow({
      where: { id: req.body.scrapeItemId },
    });

    authoriseScrapeUser(req.user!.scrapeUsers, scrapeItem.scrapeId, res);

    await prisma.knowledgeGroup.update({
      where: { id: scrapeItem.knowledgeGroupId },
      data: { updateProcessId: null },
    });

    res.json({ message: "ok" });
  }
);

app.post(
  "/text-page",
  authenticate,
  async function (req: Request, res: Response) {
    const { title, text, knowledgeGroupId, pageId, pages } = req.body;

    const knowledgeGroup = await prisma.knowledgeGroup.findFirstOrThrow({
      where: { id: knowledgeGroupId },
      include: {
        scrape: {
          include: {
            user: true,
          },
        },
      },
    });

    authoriseScrapeUser(req.user!.scrapeUsers, knowledgeGroup.scrapeId, res);

    const processId = uuidv4();

    await prisma.knowledgeGroup.update({
      where: { id: knowledgeGroupId },
      data: { status: "processing", updateProcessId: processId },
    });

    if (title && text && pageId) {
      await scheduleUrl(knowledgeGroup, processId, pageId, pageId, {
        standAlone: true,
        textPage: {
          title,
          text,
        },
      });
    }

    if (pages) {
      await scheduleUrls(
        knowledgeGroup,
        processId,
        pages.map((page: { title: string; text: string; pageId: string }) => ({
          url: page.pageId,
          sourcePageId: page.pageId,
          jobData: {
            textPage: {
              title: page.title,
              text: page.text,
            },
            standAlone: true,
          },
        }))
      );
    }

    res.json({ message: "ok" });
  }
);

app.get(
  "/process-status",
  authenticate,
  async function (req: Request, res: Response) {
    const { knowledgeGroupId } = req.query;

    const knowledgeGroup = await prisma.knowledgeGroup.findFirstOrThrow({
      where: { id: knowledgeGroupId as string },
    });

    authoriseScrapeUser(req.user!.scrapeUsers, knowledgeGroup.scrapeId, res);

    const state = {
      pending: 0,
      status: knowledgeGroup.status,
    };

    if (knowledgeGroup.updateProcessId) {
      state.pending = await getPendingUrls(knowledgeGroup.updateProcessId);
    }

    res.json(state);
  }
);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

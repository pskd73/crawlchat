import { KnowledgeGroup, prisma, Scrape } from "libs/prisma";
import { getNextUpdateTime } from "libs/knowledge-group";
import {
  KbContent,
  KbProcesserListener,
  KbProcessProgress,
} from "./kb-processer";
import { makeIndexer } from "../indexer/factory";
import { splitMarkdown } from "../scrape/markdown-splitter";
import { deleteByIds, makeRecordId } from "../scrape/pinecone";
import { v4 as uuidv4 } from "uuid";
import { consumeCredits } from "libs/user-plan";

export class BaseKbProcesserListener implements KbProcesserListener {
  constructor(
    private readonly scrape: Scrape,
    private readonly knowledgeGroup: KnowledgeGroup,
    private readonly broadcast: (type: string, data: any) => void,
    private readonly options?: {
      includeMarkdown?: boolean;
      hasCredits: (n?: number) => Promise<boolean>;
    }
  ) {}

  async onBeforeStart() {
    this.broadcast("scrape-start", {
      scrapeId: this.scrape.id,
      knowledgeGroupId: this.knowledgeGroup.id,
    });
    await prisma.knowledgeGroup.update({
      where: { id: this.knowledgeGroup.id },
      data: { status: "processing" },
    });
  }

  async onComplete() {
    this.broadcast("scrape-complete", {
      scrapeId: this.scrape.id,
      knowledgeGroupId: this.knowledgeGroup.id,
    });

    await prisma.knowledgeGroup.update({
      where: { id: this.knowledgeGroup.id },
      data: {
        status: "done",
        lastUpdatedAt: new Date(),
        nextUpdateAt: getNextUpdateTime(
          this.knowledgeGroup.updateFrequency,
          new Date()
        ),
      },
    });
    this.broadcast("saved", { scrapeId: this.scrape.id });
  }

  async onError(path: string, error: any) {
    await prisma.scrapeItem.upsert({
      where: {
        knowledgeGroupId_url: {
          knowledgeGroupId: this.knowledgeGroup.id,
          url: path,
        },
      },
      update: {
        status: "failed",
        error: `${error.message.toString()}\n\n${error.stack}`,
      },
      create: {
        userId: this.scrape.userId,
        scrapeId: this.scrape.id,
        knowledgeGroupId: this.knowledgeGroup.id,
        url: path,
        status: "failed",
        error: error.message.toString(),
      },
    });
  }

  async onContentAvailable(
    path: string,
    content: KbContent,
    progress: KbProcessProgress
  ) {
    if (content.error) {
      throw new Error(content.error);
    }

    const indexer = makeIndexer({ key: this.scrape.indexer });
    const chunks = await splitMarkdown(content.text, {
      context: this.knowledgeGroup.itemContext ?? undefined,
    });

    console.log("Checking credits for", chunks.length);
    if (!(await this.options?.hasCredits(chunks.length))) {
      console.log("Throwing error for not enough credits");
      throw new Error("Not enough credits");
    }

    const documents = chunks.map((chunk) => ({
      id: makeRecordId(this.scrape.id, uuidv4()),
      text: chunk,
      metadata: { content: chunk, url: path },
    }));
    await indexer.upsert(this.scrape.id, documents);

    const existingItem = await prisma.scrapeItem.findFirst({
      where: { scrapeId: this.scrape.id, url: path },
    });
    if (existingItem) {
      await deleteByIds(
        indexer.getKey(),
        existingItem.embeddings.map((embedding) => embedding.id)
      );
    }

    await prisma.scrapeItem.upsert({
      where: {
        knowledgeGroupId_url: {
          knowledgeGroupId: this.knowledgeGroup.id,
          url: path,
        },
      },
      update: {
        markdown: content.text,
        title: content.title,
        metaTags: content.metaTags,
        embeddings: documents.map((doc) => ({
          id: doc.id,
        })),
        status: "completed",
      },
      create: {
        userId: this.scrape.userId,
        scrapeId: this.scrape.id,
        knowledgeGroupId: this.knowledgeGroup.id,
        url: path,
        markdown: content.text,
        title: content.title,
        metaTags: content.metaTags,
        embeddings: documents.map((doc) => ({
          id: doc.id,
        })),
        status: "completed",
      },
    });

    await consumeCredits(this.scrape.userId, "scrapes", documents.length);

    this.broadcast("scrape-pre", {
      url: path,
      markdown: this.options?.includeMarkdown ? content.text : undefined,
      scrapedUrlCount: progress.completed,
      remainingUrlCount: progress.remaining,
      knowledgeGroupId: this.knowledgeGroup.id,
    });
  }
}

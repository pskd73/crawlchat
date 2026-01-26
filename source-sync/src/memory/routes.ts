import express from "express";
import type { Request, Response } from "express";
import { extract } from "./extract";
import { scrape, scrapeWithLinks } from "src/scrape/crawl";
import {
  getAllNodes,
  getAllRelationships,
  getNodes,
  upsert,
  removeByChunk,
} from "@packages/graph/graph";

const router = express.Router();

router.post("/extract", async (req: Request, res: Response) => {
  const { url, collectionId } = req.body;

  if (!collectionId) {
    return res.status(400).json({ error: "collectionId is required" });
  }

  const visited = new Set<string>(url);
  const links = [url];

  while (links.length > 0) {
    const link = links.pop();
    if (!link) continue;

    console.log(`Scraping ${link}`);

    try {
      const result = await scrapeWithLinks(link, url);
      for (const link of result.links) {
        if (!visited.has(link)) {
          visited.add(link);
          links.push(link);
        }
      }

      const existingNodes = await getAllNodes(collectionId);
      const { relationships } = await extract(result.markdown, existingNodes);

      for (const relationship of relationships) {
        await upsert(
          collectionId,
          relationship.from,
          relationship.to,
          relationship.relationship,
          link
        );
      }
    } catch (error) {
      console.error(error);
    }
  }

  const finalNodes = await getAllNodes(collectionId);
  const finalRelationships = await getAllRelationships(collectionId);

  res.json({ nodes: finalNodes, relationships: finalRelationships });
});

router.post("/upsert", async (req: Request, res: Response) => {
  const { collectionId, relationships, chunkId } = req.body;

  if (!chunkId) {
    return res.status(400).json({ error: "chunkId is required" });
  }

  for (const relationship of relationships) {
    await upsert(
      collectionId,
      relationship.from,
      relationship.to,
      relationship.relationship,
      chunkId
    );
  }
  res.json({ success: true });
});

router.get("/nodes", async (req: Request, res: Response) => {
  const { collectionId } = req.query;
  const nodes = await getAllNodes(collectionId as string);
  res.json({ nodes });
});

router.get("/relationships", async (req: Request, res: Response) => {
  const { collectionId } = req.query;
  const relationships = await getAllRelationships(collectionId as string);
  res.json({ relationships });
});

router.get("/node", async (req: Request, res: Response) => {
  const { collectionId, name } = req.query;
  const names = Array.isArray(name) ? name : [name];
  const nodes = await getNodes(collectionId as string, names as string[]);
  res.json({ nodes });
});

router.post("/remove", async (req: Request, res: Response) => {
  const { collectionId, chunkId } = req.body;

  if (!collectionId) {
    return res.status(400).json({ error: "collectionId is required" });
  }

  if (!chunkId) {
    return res.status(400).json({ error: "chunkId is required" });
  }

  await removeByChunk(collectionId, chunkId);
  res.json({ success: true });
});

export default router;

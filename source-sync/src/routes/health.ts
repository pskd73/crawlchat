import { Router } from "express";
import { prisma } from "@packages/common/prisma";
import { Pinecone } from "@pinecone-database/pinecone";
import { RateLimiter } from "@packages/common/rate-limiter";
import { redis } from "../source/queue";

const rateLimiter = new RateLimiter(20, "health");
const router = Router();

router.get("/", async (req, res) => {
  try {
    rateLimiter.check();
  } catch (error) {
    res.status(200).json({
      status: "ok",
      message: "Rate limit exceeded",
    });
    return;
  }

  const mongoCheck = prisma.scrape.findFirst({
    select: { id: true },
  });

  const pineconeCheck = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  }).listIndexes();

  const redisCheck = redis.ping().then((result) => {
    if (result !== "PONG") {
      throw new Error(`Redis ping returned ${result}`);
    }
  });

  const [mongoResult, pineconeResult, redisResult] = await Promise.allSettled([
    mongoCheck,
    pineconeCheck,
    redisCheck,
  ]);

  const checks = {
    mongo: mongoResult.status === "fulfilled" ? "up" : "down",
    pinecone: pineconeResult.status === "fulfilled" ? "up" : "down",
    redis: redisResult.status === "fulfilled" ? "up" : "down",
  };

  const isHealthy =
    checks.mongo === "up" && checks.pinecone === "up" && checks.redis === "up";

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    checks,
    uptimeSec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;

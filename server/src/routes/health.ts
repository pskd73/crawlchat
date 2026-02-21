import { Router } from "express";
import { prisma } from "@packages/common/prisma";
import { Pinecone } from "@pinecone-database/pinecone";
import { Agent, handleStream } from "@packages/agentic";
import { getConfig } from "../llm/config";
import { RateLimiter } from "@packages/common/rate-limiter";

const aiRateLimiter = new RateLimiter(2, "health-ai");
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

  const [mongoResult, pineconeResult] = await Promise.allSettled([
    mongoCheck,
    pineconeCheck,
  ]);

  const checks = {
    mongo: mongoResult.status === "fulfilled" ? "up" : "down",
    pinecone: pineconeResult.status === "fulfilled" ? "up" : "down",
  };

  const isHealthy = checks.mongo === "up" && checks.pinecone === "up";

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    checks,
    uptimeSec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

router.get("/ai", async (req, res) => {
  try {
    aiRateLimiter.check();
  } catch (error) {
    res.status(200).json({
      status: "ok",
      message: "Rate limit exceeded",
    });
    return;
  }

  const llmConfig = getConfig("openrouter/openai/gpt-4o-mini");

  const agent = new Agent({
    id: "health-check",
    prompt:
      "You are a health check agent. You are tasked with checking the health of the AI system.",
    maxTokens: 512,
    ...llmConfig,
  });

  await handleStream(
    await agent.stream([
      {
        role: "user",
        content: "Are you alive? Respond with a single word: yes or no.",
      },
    ])
  );

  res.json({
    status: "ok",
    uptimeSec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;

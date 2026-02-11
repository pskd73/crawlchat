import { RateLimiter } from "@packages/common/rate-limiter";

export const socketAskRateLimiter = new RateLimiter(30, "socket-ask");
export const draftRateLimiter = new RateLimiter(20, "draft");
export const mcpRateLimiter = new RateLimiter(40, "mcp");

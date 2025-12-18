import { Request, Response, NextFunction } from "express";
import { prisma } from "./prisma";
import { Prisma, ScrapeUser } from "libs/prisma";
import { verifyToken } from "libs/jwt";

export enum AuthMode {
  jwt,
  apiKey,
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let user: Prisma.UserGetPayload<{
      include: {
        scrapeUsers: true;
      };
    }> | null = null;
    let authMode: AuthMode = AuthMode.jwt;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      const decoded = verifyToken(token);
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          scrapeUsers: true,
        },
      });
    }

    const xApiKey = req.headers["x-api-key"];
    if (xApiKey) {
      const apiKey = await prisma.apiKey.findFirst({
        where: { key: xApiKey as string },
        include: {
          user: {
            include: {
              scrapeUsers: true,
            },
          },
        },
      });
      if (apiKey?.user) {
        user = apiKey?.user;
        authMode = AuthMode.apiKey;
      }
    }

    if (!user) {
      res.status(401).json({ error: "Invalid authorization" });
      return;
    }
    req.user = user;
    req.authMode = authMode;
    next();
  } catch (error) {
    res.status(401).json({ error: "Authorization failed" });
    return;
  }
}

export async function adminAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await authenticate(req, res, () => {
    const adminEmails = ["pramodkumar.damam73@gmail.com"];
    if (!req.user?.email || !adminEmails.includes(req.user.email)) {
      res.status(403).json({ message: "Forbidden: Admin access only" });
      return;
    }
    next();
  });
}

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

export function authoriseScrapeUser(
  scrapeUsers: ScrapeUser[],
  scrapeId: string,
  response: Response
) {
  if (!scrapeUsers.find((su) => su.scrapeId === scrapeId)) {
    response.status(401).json({ error: "Unauthorised" });
    throw new Error("Unauthorised");
  }
}

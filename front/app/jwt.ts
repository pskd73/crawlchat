import { prisma } from "@packages/common/prisma";
import jwt, { type JwtPayload } from "jsonwebtoken";

interface UserPayload extends JwtPayload {
  userId: string;
}

export async function getJwtAuthUser(request: Request) {
  const headers = request.headers;
  const token = headers.get("Authorization")?.split(" ")[1];

  if (!token) {
    throw Response.json({ error: "No token provided" }, { status: 401 });
  }

  const userPayload = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload;

  const user = await prisma.user.findUnique({
    where: { id: userPayload.userId },
    include: {
      scrapeUsers: true,
    },
  });

  if (!user) {
    throw Response.json({ error: "Invalid token" }, { status: 401 });
  }

  return user;
}

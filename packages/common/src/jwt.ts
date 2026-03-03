import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";

interface UserPayload extends JwtPayload {
  userId: string;
}

export function verifyToken(token: string): UserPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as UserPayload;
}

export function createToken(
  userId: string,
  options?: { expiresInSeconds?: number }
) {
  const expiresInSeconds = options?.expiresInSeconds ?? 60;
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: `${expiresInSeconds}s`,
  });
}

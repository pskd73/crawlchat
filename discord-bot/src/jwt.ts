import jwt from "jsonwebtoken";

export function createToken(
  userId: string,
  options?: { expiresInSeconds?: number }
) {
  const expiresInSeconds = options?.expiresInSeconds ?? 60;
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: `${expiresInSeconds}s`,
  });
}

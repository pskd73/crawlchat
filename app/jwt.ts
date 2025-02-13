import jwt from "jsonwebtoken";

export function createToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: "60s",
  });
}

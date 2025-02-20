import type { User } from "@prisma/client";
import { createCookieSessionStorage } from "react-router";

type SessionData = {
  userId: string;
  magicLink: string;
  email: string;
  user: User;
  chatSessionKey: string;
  __flash_error__: string;
};

type SessionFlashData = {
  error: string;
};

export const sessionStorage = createCookieSessionStorage<
  SessionData,
  SessionFlashData
>({
  cookie: {
    name: "__session",
    secrets: ["s3cr3t"],
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;

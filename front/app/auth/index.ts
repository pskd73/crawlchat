import type { User } from "libs/prisma";
import { Authenticator } from "remix-auth";
import { prisma } from "~/prisma";
import { sessionStorage } from "~/session";
import { EmailLinkStrategy } from "./email-strategy";
import { sendEmail } from "~/email";
import { createToken } from "~/jwt";
import { PLAN_FREE } from "libs/user-plan";

export const authenticator = new Authenticator<User | null>();

authenticator.use(
  new EmailLinkStrategy(
    {
      sendEmail: async ({ emailAddress, magicLink }) => {
        await sendEmail(
          emailAddress,
          "Login to CrawlChat",
          `Click here to login: ${magicLink}`
        );
      },
      secret: "secret",
      callbackURL: "/login/verify",
      successRedirect: "/app",
      failureRedirect: "/login",
      emailSentRedirect: "/login?mail-sent=true",
      sessionStorage,
    },
    async ({ email }) => {
      let user = await prisma.user.findUnique({
        where: { email: email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: email,
            plan: {
              planId: PLAN_FREE.id,
              type: PLAN_FREE.type,
              provider: "CUSTOM",
              status: "ACTIVE",
              activatedAt: new Date(),
            },
          },
        });
      }

      return user;
    }
  ),
  "magic-link"
);

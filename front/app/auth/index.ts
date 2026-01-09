import type { User } from "libs/prisma";
import { Authenticator } from "remix-auth";
import { sessionStorage } from "~/session";
import { EmailLinkStrategy } from "./email-strategy";
import { sendLoginEmail } from "~/email";
import { GoogleStrategy } from "./google-strategy";
import { signUpNewUser } from "./signup";

export const authenticator = new Authenticator<User | null>();

const googleStrategy = new GoogleStrategy(
  {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectURI: process.env.GOOGLE_REDIRECT_URI!,
  },
  async ({ tokens }) => {
    const profile = await GoogleStrategy.userProfile(tokens);
    return await signUpNewUser(profile.emails[0].value, {
      name: profile.displayName,
      photo: profile.photos[0].value,
    });
  }
);

authenticator.use(googleStrategy);

authenticator.use(
  new EmailLinkStrategy(
    {
      sendEmail: async ({ emailAddress, magicLink }) => {
        await sendLoginEmail(emailAddress, magicLink);
      },
      secret: "secret",
      callbackURL: "/login/verify",
      successRedirect: "/app",
      failureRedirect: "/login?error=true",
      emailSentRedirect: "/login?mail-sent=true",
      sessionStorage,
    },
    async ({ email }) => {
      return await signUpNewUser(email);
    }
  ),
  "magic-link"
);

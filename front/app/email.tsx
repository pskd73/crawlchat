import { Resend } from "resend";
import WelcomeEmail from "emails/welcome";
import InvitationEmail from "emails/invitation";
import TeamJoinEmail from "emails/team-join";
import LowCreditsEmail from "emails/low-credits";
import LoginEmail from "emails/login";

export const sendEmail = async (to: string, subject: string, text: string) => {
  try {
    const resend = new Resend(process.env.RESEND_KEY!);
    await resend.emails.send({
      from: "CrawlChat <welcome@mail.crawlchat.app>",
      to,
      subject,
      text,
    });
  } catch (error) {
    throw new Error(JSON.stringify(error));
  }
};

export const sendReactEmail = async (
  to: string,
  subject: string,
  component: React.ReactNode
) => {
  try {
    const resend = new Resend(process.env.RESEND_KEY!);
    await resend.emails.send({
      from: "CrawlChat <welcome@mail.crawlchat.app>",
      to,
      subject,
      react: component,
    });
  } catch (error) {
    throw new Error(JSON.stringify(error));
  }
};

export const sendWelcomeEmail = async (to: string) => {
  await sendReactEmail(to, "Welcome to CrawlChat", <WelcomeEmail />);
};

export const sendInvitationEmail = async (
  to: string,
  invitedBy: string,
  scrapeTitle: string
) => {
  await sendReactEmail(
    to,
    `Invited to ${scrapeTitle}`,
    <InvitationEmail invitedBy={invitedBy} scrapeTitle={scrapeTitle} />
  );
};

export const sendLoginEmail = async (to: string, url: string) => {
  await sendReactEmail(to, "Login to CrawlChat", <LoginEmail url={url} />);
};
export const sendTeamJoinEmail = async (
  to: string,
  invitedBy: string,
  scrapeTitle: string
) => {
  await sendReactEmail(
    to,
    `Joined ${scrapeTitle}`,
    <TeamJoinEmail invitedBy={invitedBy} scrapeTitle={scrapeTitle} />
  );
};

export const sendLowCreditsEmail = async (
  to: string,
  scrapeTitle: string,
  name: string,
  creditType: string,
  credits: number
) => {
  await sendReactEmail(
    to,
    `Low Credits on ${scrapeTitle || "collection"}`,
    <LowCreditsEmail
      name={name}
      creditType={creditType}
      credits={credits}
      scrapeTitle={scrapeTitle}
    />
  );
};

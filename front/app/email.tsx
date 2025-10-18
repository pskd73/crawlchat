import { Resend } from "resend";
import WelcomeEmail from "emails/welcome";
import InvitationEmail from "emails/invitation";
import TeamJoinEmail from "emails/team-join";
import LowCreditsEmail from "emails/low-credits";
import LoginEmail from "emails/login";
import DataGapAlertEmail from "emails/data-gap-alert";
import TicketUserCreateEmail from "emails/ticket-user-create";
import TicketAdminCreateEmail from "emails/ticket-admin-create";
import ChatVerifyEmail from "emails/chat-verify-email";

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

export const sendDataGapAlertEmail = async (
  to: string,
  scrapeTitle: string,
  title: string,
  description: string
) => {
  await sendReactEmail(
    to,
    `Data Gap Found in ${scrapeTitle}`,
    <DataGapAlertEmail
      scrapeTitle={scrapeTitle}
      title={title}
      description={description}
    />
  );
};

export const sendNewTicketUserEmail = async (
  to: string,
  scrapeTitle: string,
  ticketNumber: number,
  ticketKey: string,
  title: string
) => {
  await sendReactEmail(
    to,
    `Ticket created (#${ticketNumber})`,
    <TicketUserCreateEmail
      scrapeTitle={scrapeTitle ?? "CrawlChat"}
      ticketNumber={ticketNumber}
      ticketKey={ticketKey}
      title={title}
    />
  );
};

export const sendNewTicketAdminEmail = async (
  to: string,
  scrapeTitle: string,
  ticketNumber: number,
  title: string,
  message: string,
  email: string
) => {
  await sendReactEmail(
    to,
    `New ticket (#${ticketNumber})`,
    <TicketAdminCreateEmail
      scrapeTitle={scrapeTitle ?? "CrawlChat"}
      ticketNumber={ticketNumber}
      title={title}
      message={message}
      email={email}
    />
  );
};

export const sendChatVerifyEmail = async (to: string, otp: string) => {
  await sendReactEmail(to, "Verify email", <ChatVerifyEmail otp={otp} />);
};

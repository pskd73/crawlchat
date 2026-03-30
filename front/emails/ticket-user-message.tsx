import { Markdown } from "@react-email/components";
import { emailConfig } from "./config";
import { MailTemplate } from "./template";

export default function TicketUserMessageEmail({
  scrapeTitle,
  ticketNumber,
  ticketKey,
  title,
  message,
}: {
  scrapeTitle: string;
  ticketNumber: number;
  ticketKey: string;
  title: string;
  message: string;
}) {
  const url = `${emailConfig.baseUrl}/ticket/${ticketNumber}?key=${ticketKey}`;
  return (
    <MailTemplate
      title="CrawlChat Ticket"
      preview="You have a new message on your ticket"
      heading="Ticket"
      icon="🎫"
      brand={scrapeTitle}
      noEmailPreferences
      cta={{
        text: "View ticket",
        href: url,
      }}
    >
      <p>
        You have a new message on your ticket. Use the below button or this link
        to view the ticket. Anyone with this link can view and reply to the
        ticket.
      </p>
      <p style={{ fontWeight: "bold" }}>{title ?? "Sample ticket title"}</p>
      <Markdown>{message ?? "Sample message"}</Markdown>
      <p style={{ opacity: 0.5 }}>{url}</p>
    </MailTemplate>
  );
}

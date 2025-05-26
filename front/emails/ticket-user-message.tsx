import { Text, Markdown } from "@react-email/components";
import { MailTemplate } from "./template";
import { emailConfig } from "./config";

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
      <Text>
        You have a new message on your ticket. Use the below button or this link
        to view the ticket. Anyone with this link can view and reply to the
        ticket.
      </Text>
      <Text style={{ fontWeight: "bold" }}>
        {title ?? "Sample ticket title"}
      </Text>
      <Markdown>{message}</Markdown>
      <Text style={{ opacity: 0.5 }}>{url}</Text>
    </MailTemplate>
  );
}

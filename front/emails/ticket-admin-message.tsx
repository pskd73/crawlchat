import { emailConfig } from "./config";
import { MailTemplate } from "./template";
import { TicketTags } from "./ticket-admin-create";

export default function TicketAdminMessageEmail({
  scrapeTitle,
  ticketNumber,
  title,
  message,
  email,
  customTags,
}: {
  scrapeTitle: string;
  ticketNumber: number;
  title: string;
  message: string;
  email: string;
  customTags?: Record<string, string | boolean | number> | null;
}) {
  const url = `${emailConfig.baseUrl}/ticket/${ticketNumber}`;
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
        You have a new message on a ticket. Use the below button or this link to
        view the ticket. Anyone with this link can view and reply to the ticket.
      </p>
      <p>
        <span style={{ opacity: 0.5 }}>Email</span>
        <br />
        {email ?? "user@example.com"}
        <br />
        <br />
        {customTags && Object.keys(customTags).length > 0 && (
          <TicketTags tags={customTags} />
        )}
        <span style={{ opacity: 0.5 }}>Title</span>
        <br />
        {title ?? "Sample ticket title"}
        <br />
        <br />
        <span style={{ opacity: 0.5 }}>Message</span>
        <br />
        {message ?? "Sample message"}
      </p>
      <p style={{ opacity: 0.5 }}>{url}</p>
    </MailTemplate>
  );
}

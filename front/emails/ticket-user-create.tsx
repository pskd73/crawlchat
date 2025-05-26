import { Text } from "@react-email/components";
import { MailTemplate } from "./template";
import { emailConfig } from "./config";

export default function TicketUserCreateEmail({
  scrapeTitle,
  ticketNumber,
  ticketKey,
  title,
}: {
  scrapeTitle: string;
  ticketNumber: number;
  ticketKey: string;
  title: string;
}) {
  const url = `${emailConfig.baseUrl}/ticket/${ticketNumber}?key=${ticketKey}`;
  return (
    <MailTemplate
      title="CrawlChat Ticket"
      preview="Your ticket has been created"
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
        Ticket has been created! Use the below button or this link to view the
        ticket. Anyone with this link can view and reply to the ticket.
      </Text>
      <Text style={{ fontWeight: "bold" }}>
        {title ?? "Sample ticket title"}
      </Text>
      <Text style={{ opacity: 0.5 }}>{url}</Text>
    </MailTemplate>
  );
}

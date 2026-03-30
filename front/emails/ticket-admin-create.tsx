import { emailConfig } from "./config";
import { MailTemplate } from "./template";

export function TicketTags({
  tags,
}: {
  tags: Record<string, string | boolean | number>;
}) {
  return (
    <>
      <span style={{ opacity: 0.5 }}>Tags</span>
      <br />
      <span>
        {Object.keys(tags).map((key) => (
          <span
            key={key}
            style={{
              marginRight: "10px",
              border: "1px solid #e0e0e0",
              padding: "5px 10px",
              borderRadius: "5px",
            }}
          >
            <span style={{ opacity: 0.5 }}>{key}:</span> {tags[key]}
          </span>
        ))}
      </span>
      <br />
      <br />
    </>
  );
}

export default function TicketAdminCreateEmail({
  scrapeTitle,
  ticketNumber,
  title,
  message,
  email,
  tags,
}: {
  scrapeTitle: string;
  ticketNumber: number;
  title: string;
  message: string;
  email: string;
  tags?: Record<string, string | boolean | number> | null;
}) {
  const url = `${emailConfig.baseUrl}/ticket/${ticketNumber}`;
  return (
    <MailTemplate
      title="CrawlChat Ticket"
      preview="You have a new ticket to resolve"
      heading="Ticket"
      icon="🎫"
      brand={scrapeTitle}
      cta={{
        text: "View ticket",
        href: url,
      }}
    >
      <p>You have a new ticket to resolve. Here are the details:</p>

      <p>
        <span style={{ opacity: 0.5 }}>Email</span>
        <br />
        {email ?? "user@example.com"}
        <br />
        <br />
        {tags && Object.keys(tags).length > 0 && <TicketTags tags={tags} />}
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

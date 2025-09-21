import { Text, Markdown } from "@react-email/components";
import { MailTemplate } from "./template";
import { emailConfig } from "./config";

export default function DataGapAlertEmail({
  title,
  description,
  scrapeTitle,
}: {
  title: string;
  description: string;
  scrapeTitle: string;
}) {
  return (
    <MailTemplate
      title="Data Gap Found"
      preview="You have a new data gap in your documentation"
      heading="Data Gap"
      icon="📣"
      brand={"CrawlChat"}
      cta={{
        text: "View data gap",
        href: `${emailConfig.baseUrl}/data-gaps`,
      }}
    >
      <Text>
        There is a new data gap found for one of questions someone asked in{" "}
        {scrapeTitle} collection. Here are the details:
      </Text>
      <Text style={{ fontWeight: "bold" }}>
        {title ?? "Sample data gap title"}
      </Text>
      <Markdown>{description ?? "Sample data gap description"}</Markdown>
    </MailTemplate>
  );
}

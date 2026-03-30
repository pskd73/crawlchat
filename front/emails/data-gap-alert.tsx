import { emailConfig } from "./config";
import { MailTemplate } from "./template";

export default function DataGapAlertEmail({
  title,
  scrapeTitle,
}: {
  title: string;
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
      footerLinks={[
        {
          label: "Set min score",
          href: `${emailConfig.baseUrl}/settings#data-gap-min-score`,
        },
      ]}
    >
      <p>
        There is a new data gap found for one of questions someone asked in{" "}
        {scrapeTitle} collection. Here are the details:
      </p>
      <p style={{ fontWeight: "bold" }}>{title ?? "Sample data gap title"}</p>
    </MailTemplate>
  );
}

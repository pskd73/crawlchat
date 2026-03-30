import { emailConfig } from "./config";
import { MailTemplate } from "./template";

export default function LowCreditsEmail({
  name,
  creditType,
  credits,
  scrapeTitle,
}: {
  name: string;
  creditType: string;
  credits: number;
  scrapeTitle: string;
}) {
  return (
    <MailTemplate
      title="CrawlChat Credits Alert"
      preview={"You have low credits left"}
      heading="Alert"
      icon="⚠️"
      brand="CrawlChat"
      noEmailPreferences
      cta={{
        text: "Upgrade",
        href: `${emailConfig.baseUrl}/profile#billing`,
      }}
    >
      <p style={{ marginBottom: "10px" }}>Hello {name || "there"} 👋</p>
      <p>
        You have{" "}
        <span style={{ fontWeight: "bold" }}>
          {credits ?? 0} {creditType ?? ""} credits
        </span>{" "}
        left on your{" "}
        <span style={{ fontWeight: "bold" }}>
          {scrapeTitle || "collection"}
        </span>{" "}
        collection. Please upgrade to an higher plan or top up the credits.
        Click the following button to go to your billing section.
      </p>
    </MailTemplate>
  );
}

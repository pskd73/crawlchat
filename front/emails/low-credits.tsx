import { Container } from "@react-email/components";
import { MailTemplate } from "./template";
import { emailConfig } from "./config";

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
      <Container style={{ marginBottom: "10px" }}>
        Hello {name || "there"} 👋
      </Container>
      <Container>
        You have{" "}
        <span style={{ fontWeight: "bold" }}>
          {credits ?? 0} {creditType ?? ""} credits
        </span>{" "}
        left on your{" "}
        <span style={{ fontWeight: "bold" }}>
          {scrapeTitle || "collection"}
        </span>{" "}
        collection. Please upgrade to an higher plan or top up the credits. Click
        the following button to go to your billing section.
      </Container>
    </MailTemplate>
  );
}

import { emailConfig } from "./config";
import { MailTemplate } from "./template";

export default function InvitationEmail({
  scrapeTitle,
  invitedBy,
}: {
  invitedBy: string;
  scrapeTitle: string;
}) {
  const url = `${emailConfig.baseUrl}/login`;
  return (
    <MailTemplate
      title="CrawlChat Invitation"
      preview={"You have been invited to " + scrapeTitle}
      heading="Invitation"
      icon="💬"
      brand={scrapeTitle}
      noEmailPreferences
      cta={{
        text: "Accept it",
        href: url,
      }}
    >
      <p>
        Hi there! You have been invited to the team of {scrapeTitle} by{" "}
        {invitedBy}. Click the following button to singup and accept the
        invitation.
      </p>
    </MailTemplate>
  );
}

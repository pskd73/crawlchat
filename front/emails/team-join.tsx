import { emailConfig } from "./config";
import { MailTemplate } from "./template";

export default function TeamJoinEmail({
  scrapeTitle,
  invitedBy,
}: {
  invitedBy: string;
  scrapeTitle: string;
}) {
  const url = `${emailConfig.baseUrl}/login`;
  return (
    <MailTemplate
      title="CrawlChat Member"
      preview={"You have been added to " + scrapeTitle}
      heading="Joined"
      icon="😎"
      brand={scrapeTitle}
      noEmailPreferences
      cta={{
        text: "Go to team",
        href: url,
      }}
    >
      <p>
        Hi there! You have been added to the team of {scrapeTitle} by{" "}
        {invitedBy}. Click the following button to go to the team.
      </p>
    </MailTemplate>
  );
}

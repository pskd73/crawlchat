import { MailTemplate } from "./template";

export default function ChatVerifyEmail({ otp }: { otp: string }) {
  return (
    <MailTemplate
      title="CrawlChat Email Verification"
      preview={"Verify your email on the chat"}
      heading="Email Verification"
      icon="🔑"
      brand={"CrawlChat"}
      noEmailPreferences
    >
      <p>
        Hello there 👋 Use the following OTP to verify your email on the chat.
      </p>
      <p style={{ fontWeight: "bold" }}>{otp ?? "UNKNOWN"}</p>
    </MailTemplate>
  );
}

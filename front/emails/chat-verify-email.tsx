import { Text } from "@react-email/components";
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
      <Text>Hello there 👋</Text>
      <Text>Use the following OTP to verify your email on the chat.</Text>
      <Text style={{ fontWeight: "bold" }}>{otp}</Text>
    </MailTemplate>
  );
}

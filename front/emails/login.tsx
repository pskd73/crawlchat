import { Text } from "@react-email/components";
import { MailTemplate } from "./template";

export default function LoginEmail({ url }: { url: string }) {
  return (
    <MailTemplate
      title="CrawlChat Login"
      preview={"Login to CrawlChat"}
      heading="Login"
      icon="💬"
      brand={"CrawlChat"}
      noEmailPreferences
      cta={{
        text: "Login",
        href: url,
      }}
    >
      <Text>Hello there 👋</Text>
      <Text>
        You have requested to login to CrawlChat using your email. Click the
        following button to login.
      </Text>
    </MailTemplate>
  );
}

import { Markdown, Text } from "@react-email/components";
import { MailTemplate } from "./template";
import { emailConfig } from "./config";

export default function WelcomeEmail() {
  return (
    <MailTemplate
      title="Welcome to CrawlChat"
      preview="Thanks for signing up on CrawlChat. Let's get you started."
      heading="Welcome"
      icon="👋"
      brand="CrawlChat"
      cta={{
        text: "Go to dashboard",
        href: `${emailConfig.baseUrl}/login`,
      }}
      noEmailPreferences
    >

      <Markdown markdownCustomStyles={{
        p: {
          lineHeight: "1.4"
        }
      }}>
        {`Hello 👋

Welcome to **CrawlChat**. You are at the right place to add AI support chatbot for your _website_, _Discord server_, _Slack_ workspace, or as _MCP_ server.

In short here is what you can do with CrawlChat:

- Set up the knowledge base from your website, files, etc.
- Embed the chatbot on your website
- Add bot to your Discord server or Slack workspace
- Set up MCP server for your documentation
- View the reports of queries, data gaps, and more

You can test out the platform for your use case and upgrade to the paid plans to get following benefits:

- Best AI models
- Show sources for answers
- Add team members

Here are few links to get you started:

- [Ask any query](https://crawlchat.app/w/crawlchat)
- [Discord](https://discord.gg/zW3YmCRJkC)

Looking forward to see you integrate CrawlChat in your products and services 🚀

Pramod @ CrawlChat
`}
      </Markdown>
    </MailTemplate>
  );
}

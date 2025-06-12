import { Markdown, Text } from "@react-email/components";
import { MailTemplate } from "./template";
import { emailConfig } from "./config";

const sampleActions = [
  {
    text: "Add your own documentation as knowledge base by **scraping**",
    url: `${emailConfig.baseUrl}/login`,
    done: true,
  },
  {
    text: "Upload **PDFs** as knowledge base",
    url: `${emailConfig.baseUrl}/login`,
    done: false,
  },
  {
    text: "Embed the AI chatbot on your website, Discord server, or Slack",
    url: `${emailConfig.baseUrl}/login`,
    done: false,
  },
  {
    text: "Enable **support tickets** for your users",
    url: `${emailConfig.baseUrl}/login`,
    done: false,
  },
  {
    text: "Resolve them manually or with **AI**",
    url: `${emailConfig.baseUrl}/login`,
    done: false,
  },
  {
    text: "Monitor and analyze queries, data growth, and more",
    url: `${emailConfig.baseUrl}/login`,
    done: false,
  },
]

export default function SetupProgressEmail({
  actions,
}: {
  actions: { text: string; url: string; done: boolean }[];
}) {
  actions = actions ?? sampleActions;

  function getActionText(text: string, done: boolean, url: string) {
    if (!done) {
      return `⚪️ [${text}](${url})`;
    }
    return `✅ ${text}`;
  }

  return (
    <MailTemplate
      title="Complete chatbot setup"
      preview="Quick overview of your setup progress"
      heading="Config chatbot"
      icon="⚙️"
      brand="CrawlChat"
      cta={{
        text: "Go to dashboard",
        href: `${emailConfig.baseUrl}/login`,
      }}
    >
      <Markdown
        markdownCustomStyles={{
          p: {
            lineHeight: "1.4",
          },
        }}
      >
        {`Hello 👋

Looks like you are still setting up your chatbot. Here is a quick overview of the actions to integrate AI chatbot:

${actions
  .map((action) => "- " + getActionText(action.text, action.done, action.url))
  .join("\n")}

You can find any help required [here](https://crawlchat.app/w/crawlchat). Looking forward to see you integrate CrawlChat in your products and services 🚀

CrawlChat Team
`}
      </Markdown>
    </MailTemplate>
  );
}

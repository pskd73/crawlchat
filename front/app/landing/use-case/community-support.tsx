import { SiDocusaurus, SiLinear } from "react-icons/si";
import {
  TbBrandDiscord,
  TbBrandGithub,
  TbBrandSlack,
  TbChartBar,
  TbCheck,
  TbClock,
  TbLanguage,
  TbLink,
  TbMessagePlus,
  TbMessages,
  TbSettings,
  TbUpload,
  TbWorld,
} from "react-icons/tb";
import { MCPIcon } from "~/components/mcp-icon";
import { makeMeta } from "~/meta";
import { Container, HeadingHighlight } from "../page";
import { Channels, Connectors, UseCaseHero, UseCaseIssues } from "./component";

export function meta() {
  return makeMeta({
    title: "Community support - CrawlChat",
    description:
      "Transform your technical documentation into an instant answering system for your community.",
  });
}

export default function CommunitySupport() {
  return (
    <>
      <Container>
        <UseCaseHero
          title={
            <>
              <span className="text-primary">Reduce your tech queries</span>{" "}
              from your SaaS community
            </>
          }
          description="Most queries from your community are already answered in your documentation. With CrawlChat, enable your documentation to answer queries instantly on the platforms where your community engages."
        />
      </Container>

      <Container>
        <UseCaseIssues
          issues={[
            {
              question:
                "Why are people unable to find answers from the docs website?",
              shortAnswer: "Embed the answering agent on your website",
              answer:
                "The way people consume documentation is changing. Text based search is no longer sufficient. CrawlChat provides a chat widget you can embed on your website, enabling your community to get instant answers directly from your documentation. Each answer includes links to the source documentation used.",
              image: "/use-case/chat-widget.png",
              features: [
                {
                  icon: <TbWorld />,
                  text: "Embed on web",
                },
                {
                  icon: <TbSettings />,
                  text: "Customise",
                },
                {
                  icon: <TbLink />,
                  text: "Links to your docs",
                },
              ],
            },
            {
              question:
                "Why do they keep asking the questions already answered in the docs?",
              shortAnswer: "Answers queries directly from your docs",
              answer:
                "CrawlChat builds a knowledge base from your documentation and uses it to answer questions instantly. Your community members get the answers they need without waiting for responses, ensuring your support team isn't overwhelmed with repetitive queries.",
              image: "/use-case/group-types.png",
              features: [
                {
                  icon: <TbClock />,
                  text: "24/7 availability",
                },
                {
                  icon: <TbLanguage />,
                  text: "Multilingual",
                },
                {
                  icon: <TbCheck />,
                  text: "Your own docs",
                },
              ],
            },
            {
              question: "How do I set it up for my Discord server?",
              shortAnswer: "Add it as a Discord or Slack bot to your server",
              answer:
                "CrawlChat provides Discord and Slack bots you can add to your server. Community members simply tag the bot to ask questions. The bot responds within seconds and includes links to the documentation sources used in each answer.",
              image: "/use-case/discord.png",
              features: [
                {
                  icon: <TbBrandDiscord />,
                  text: "Discord bot",
                },
                {
                  icon: <TbBrandSlack />,
                  text: "Slack app",
                },
                {
                  icon: <TbLink />,
                  text: "Links to your docs",
                },
              ],
            },
            {
              question: "How do I make sure that the answers are correct?",
              shortAnswer: "Monitor answers and analytics",
              answer:
                "After integration, view all conversations and answers from the dashboard. Check the confidence score for each message and correct answers when needed. Review analytics to understand chatbot performance and continuously improve your documentation.",
              image: "/use-case/messages.png",
              features: [
                {
                  icon: <TbMessages />,
                  text: "View conversations",
                },
                {
                  icon: <TbChartBar />,
                  text: "Analytics",
                },
                {
                  icon: <TbMessagePlus />,
                  text: "Correct the answers",
                },
              ],
            },
          ]}
        />
      </Container>

      <Container>
        <Connectors
          connectors={[
            {
              icon: <TbWorld />,
              title: "Web",
              tooltip: "Scrapes any web based documentation",
            },
            {
              icon: <TbBrandGithub />,
              title: "Issues",
              tooltip: "Add GitHub issues to the knowledge base",
            },
            {
              icon: <SiDocusaurus />,
              title: "Docusaurus",
              tooltip: "Add any Docusaurus based documentation",
            },
            {
              icon: <TbUpload />,
              title: "Files",
              tooltip: "Upload files to the knowledge base",
            },
            {
              icon: <SiLinear />,
              title: "Linear",
              tooltip: "Add Linear issues and projects to the knowledge base",
            },
          ]}
          title={
            <>
              Connect your <HeadingHighlight>docs instantly</HeadingHighlight>
            </>
          }
          description="Add your documentation to the knowledge base so the chat assistant can answer questions. CrawlChat offers a wide range of connectors to instantly import your existing documentation into the knowledge base."
        />
      </Container>

      <Container>
        <Channels
          channels={[
            {
              icon: <TbWorld />,
              title: "Web widget",
              tooltip: "Embed the chat assistant on your website",
            },
            {
              icon: <TbBrandDiscord />,
              title: "Discord",
              tooltip: "Embed the chat assistant on your Discord server",
            },
            {
              icon: <TbBrandSlack />,
              title: "Slack",
              tooltip: "Embed the chat assistant on your Slack workspace",
            },
            {
              icon: <MCPIcon />,
              title: "MCP",
              tooltip: "Provide your docs as an MCP server",
            },
          ]}
          title={
            <>
              Embed the chat assistant to your{" "}
              <HeadingHighlight>community</HeadingHighlight>
            </>
          }
          description="Deliver your documentation to your community where they already engage, reducing friction in getting answers. Embed the chat assistant on these platforms to reach your community effectively."
        />
      </Container>
    </>
  );
}

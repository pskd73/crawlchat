import { SiConfluence, SiLinear } from "react-icons/si";
import {
  TbAi,
  TbBrain,
  TbBrandDiscord,
  TbBrandNotion,
  TbBrandSlack,
  TbCheck,
  TbDatabase,
  TbLink,
  TbLock,
  TbRefresh,
  TbRobotFace,
  TbUpload,
} from "react-icons/tb";
import { makeMeta } from "~/meta";
import { Container, HeadingHighlight } from "../page";
import { Channels, Connectors, UseCaseHero, UseCaseIssues } from "./component";

export function meta() {
  return makeMeta({
    title: "Empower GTM teams - CrawlChat",
    description:
      "Empower your GTM teams with instant access to comprehensive product knowledge through AI powered documentation.",
  });
}

export default function CommunitySupport() {
  return (
    <>
      <Container>
        <UseCaseHero
          title={
            <>
              Give your <span className="text-primary">GTM teams</span> full{" "}
              <span className="text-primary">context</span> about your product
            </>
          }
          description="GTM teams need comprehensive product knowledge to position effectively, communicate clearly, and drive growth. CrawlChat enables your GTM teams to ask any question about your product, helping them plan better strategies."
        />
      </Container>

      <Container>
        <UseCaseIssues
          issues={[
            {
              question:
                "How do I create a centralized knowledge base when multiple teams have their own documentation?",
              shortAnswer: "Create a unified knowledge base for your product",
              answer:
                "Companies often have documentation scattered across multiple teams. It's challenging for GTM teams like marketing, sales, and support to stay current with product information. CrawlChat creates a unified knowledge base, enabling any team to ask questions and get instant answers referencing documentation from all teams.",
              image: "/use-case/group-types.png",
              features: [
                {
                  icon: <TbDatabase />,
                  text: "Centralized knowledge base",
                },
                {
                  icon: <TbLink />,
                  text: "Links to your docs",
                },
              ],
            },
            {
              question:
                "How do I ensure documentation remains internal and private?",
              shortAnswer: "Create a private answering assistant",
              answer:
                "CrawlChat enables you to create a fully private chat assistant. Connect documentation from private content systems and integrate the assistant exclusively on private channels like Slack, Discord, or private links. Documentation is securely stored on CrawlChat's servers and shared with LLMs only when answering questions. Configure automatic synchronization to keep the assistant always up to date.",
              image: "/use-case/visibility-type.png",
              features: [
                {
                  icon: <TbLock />,
                  text: "Private assistant",
                },
                {
                  icon: <TbRefresh />,
                  text: "Auto sync",
                },
                {
                  icon: <TbRobotFace />,
                  text: "Discord & Slack bots",
                },
              ],
            },
            {
              question:
                "How do I ensure answers are well researched and accurate?",
              shortAnswer: "Advanced LLMs for research and accurate answers",
              answer:
                "Documentation collected from different teams can be complex and requires thorough research before answering. CrawlChat uses advanced LLMs from OpenAI, Anthropic, Google, and Gemini to research and answer questions. It follows best practices in the RAG process to ensure LLMs accurately reference source documents.",
              image: "/use-case/llm-models.png",
              features: [
                {
                  icon: <TbAi />,
                  text: "Best LLMs",
                },
                {
                  icon: <TbBrain />,
                  text: "Customise",
                },
                {
                  icon: <TbCheck />,
                  text: "Best RAG process",
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
              icon: <TbBrandNotion />,
              title: "Notion",
              tooltip: "Add Notion pages to the knowledge base",
            },
            {
              icon: <SiConfluence />,
              title: "Confluence",
              tooltip: "Add Confluence pages to the knowledge base",
            },
            {
              icon: <SiLinear />,
              title: "Linear",
              tooltip: "Add Linear issues and projects to the knowledge base",
            },
            {
              icon: <TbUpload />,
              title: "Files",
              tooltip: "Upload files to the knowledge base",
            },
          ]}
          title={
            <>
              Connect your <HeadingHighlight>internal docs</HeadingHighlight>
            </>
          }
          description="CrawlChat respects the privacy of your internal documentation and provides connectors to add docs directly to the knowledge base. Use these connectors to import your internal documentation securely."
        />
      </Container>

      <Container>
        <Channels
          channels={[
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
              icon: <TbLink />,
              title: "Private links",
              tooltip: "Access the chat assistant on private links",
            },
          ]}
          title={
            <>
              Embed the chat assistant to your{" "}
              <HeadingHighlight>community</HeadingHighlight>
            </>
          }
          description="Deliver your documentation to your teams where they already work, reducing friction in accessing answers. Embed the chat assistant on these platforms to reach your internal teams effectively."
        />
      </Container>
    </>
  );
}

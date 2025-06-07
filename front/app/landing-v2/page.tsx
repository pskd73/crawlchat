import {
  useMemo,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import cn from "@meltdownjs/cn";
import "../tailwind.css";
import "../fonts.css";
import {
  TbArrowRight,
  TbArrowsShuffle,
  TbBrandDiscord,
  TbBrandSlack,
  TbChartBar,
  TbClock,
  TbDatabase,
  TbFile,
  TbLoader2,
  TbMessage,
  TbRobotFace,
  TbScoreboard,
  TbSettings,
  TbSpider,
  TbWorld,
} from "react-icons/tb";
import { useOpenScrape } from "~/landing/use-open-scrape";
import { prisma } from "libs/prisma";
import type { Route } from "./+types/page";
import { Box, Text } from "@chakra-ui/react";

export function meta() {
  return [
    {
      title: "CrawlChat - Your documentation with AI!",
      description: "AI Chatbot for your knowledge base and documentation",
    },
  ];
}

const cache = {
  messagesThisWeek: 0,
  messagesDay: 0,
  messagesMonth: 0,
  updatedAt: 0,
};

export async function loader() {
  const MINS_5 = 5 * 60 * 1000;
  const DAY = 24 * 60 * 60 * 1000;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;

  const now = new Date();
  const startOfWeek = new Date(now.getTime() - WEEK);
  const startOfDay = new Date(now.getTime() - DAY);
  const startOfMonth = new Date(now.getTime() - MONTH);

  if (cache.updatedAt < now.getTime() - MINS_5) {
    cache.messagesThisWeek = await prisma.message.count({
      where: {
        createdAt: {
          gte: startOfWeek,
        },
      },
    });

    cache.messagesDay = await prisma.message.count({
      where: {
        createdAt: {
          gte: startOfDay,
        },
      },
    });

    cache.messagesMonth = await prisma.message.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });
  }

  return {
    messagesThisWeek: cache.messagesThisWeek,
    messagesDay: cache.messagesDay,
    messagesMonth: cache.messagesMonth,
  };
}

export function Container({ children }: PropsWithChildren) {
  return (
    <div className="flex justify-center">
      <div className="max-w-[1000px] w-full p-4">{children}</div>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <img src="/logo.png" alt="CrawlChat" width={38} height={38} />
      <span className="text-2xl font-bold font-radio-grotesk text-brand">
        CrawlChat
      </span>
    </div>
  );
}

function NavLink({ children, href }: PropsWithChildren<{ href: string }>) {
  return (
    <a href={href} className="font-medium hover:underline">
      {children}
    </a>
  );
}

function Button({
  children,
  className,
  variant = "outline",
  href,
}: PropsWithChildren & {
  className?: string;
  variant?: "solid" | "outline";
  href?: string;
}) {
  return (
    <a
      className={cn(
        "font-medium border text-brand border-brand rounded-xl px-6 py-1 flex items-center justify-center gap-2",
        "cursor-pointer hover:bg-brand hover:text-canvas transition-all",
        variant === "solid" && "bg-brand text-canvas",
        className
      )}
      href={href}
    >
      {children}
    </a>
  );
}

function HeroScrapeButton({
  children,
  disabled,
  type,
  onClick,
  loading,
}: PropsWithChildren<{
  disabled?: boolean;
  type?: "submit" | "reset" | "button" | undefined;
  onClick?: () => void;
  loading?: boolean;
}>) {
  return (
    <button
      className={cn(
        "bg-brand text-canvas px-6 py-4 rounded-2xl flex-shrink-0 font-medium flex items-center gap-2",
        disabled && "opacity-50"
      )}
      disabled={disabled}
      type={type}
      onClick={onClick}
    >
      {children}
      {loading && <TbLoader2 className="animate-spin" />}
    </button>
  );
}

function Scrape() {
  const { scrapeFetcher, scraping, stage, roomId, disable, openChat } =
    useOpenScrape();

  function getNote() {
    if (scrapeFetcher.data?.error) {
      return scrapeFetcher.data.error;
    }

    if (stage === "scraping") {
      return `Scraping ${scraping?.scrapedCount ?? 0} / 25`;
    }

    return "Fetches 25 pages and makes it LLM ready!";
  }

  return (
    <div>
      <div className="flex items-center gap-2 justify-center max-w-[500px] mx-auto mb-8">
        <scrapeFetcher.Form
          className="w-full"
          method="post"
          action="/open-scrape"
          style={{ width: "100%" }}
        >
          <div className="border border-outline rounded-2xl p-1 shadow-lg flex items-center gap-2 pl-6 text-xl w-full bg-canvas">
            <input type="hidden" name="intent" value="scrape" />
            <input type="hidden" name="roomId" value={roomId} />
            <input
              name="url"
              required
              pattern="https?://.*"
              type="text"
              className="w-full bg-transparent outline-none"
              placeholder="Enter your docs URL"
              disabled={stage !== "idle"}
            />
            {stage !== "saved" && (
              <HeroScrapeButton
                disabled={disable}
                type="submit"
                loading={disable}
              >
                Try it
              </HeroScrapeButton>
            )}
            {stage === "saved" && (
              <HeroScrapeButton type="button" onClick={openChat}>
                Chat
                <TbMessage />
              </HeroScrapeButton>
            )}
          </div>
        </scrapeFetcher.Form>
      </div>

      <p
        className={cn(
          "text-center text-sm opacity-40",
          scrapeFetcher.data?.error && "text-red-500"
        )}
      >
        {getNote()}
      </p>
    </div>
  );
}

function DemoWindow() {
  return (
    <div className="max-w-[900px] w-full mx-auto border border-outline shadow-md bg-ash mt-16 px-4 py-3 rounded-2xl">
      <div>
        <div className="flex items-center gap-1 mb-3">
          <div className="w-[10px] h-[10px] bg-red-500 rounded-full" />
          <div className="w-[10px] h-[10px] bg-yellow-500 rounded-full" />
          <div className="w-[10px] h-[10px] bg-green-500 rounded-full" />
        </div>
      </div>
      <div className="bg-canvas rounded-lg aspect-[960/600] overflow-hidden">
        <video
          src="https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/crawlchat-hero.mp4"
          autoPlay
          muted
          loop
        />
      </div>
    </div>
  );
}

function StatsItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex gap-4 py-6 px-6 items-center border-b border-outline last:border-b-0">
      <div className="flex-1 text-5xl md:text-6xl font-bold font-radio-grotesk">
        {value}
      </div>
      <div className="flex-1 flex justify-end">{label}</div>
    </div>
  );
}

function Stats({
  messagesThisWeek,
  messagesDay,
  messagesMonth,
}: {
  messagesThisWeek: number;
  messagesDay: number;
  messagesMonth: number;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-8 w-full mt-16 md:items-center">
      <div className="flex-1 flex flex-col gap-10">
        <div className="text-md md:text-xl font-medium px-6 py-3 shadow-md rounded-2xl bg-canvas w-fit flex items-center gap-4 -rotate-[4deg]">
          <div className="w-3 h-3 bg-green-500 rounded-full outline-2 outline-green-300 outline" />
          Serving the community
        </div>
        <h3 className="text-4xl md:text-5xl font-radio-grotesk font-bold leading-[1.2]">
          Answering <br />
          <span className="text-brand">questions</span> <br />
          continuously
        </h3>
      </div>

      <div className="flex-1 shadow-md bg-canvas rounded-2xl">
        <StatsItem label="Today" value={messagesDay} />
        <StatsItem label="In the last week" value={messagesThisWeek} />
        <StatsItem label="In the last month" value={messagesMonth} />
      </div>
    </div>
  );
}

export function UsedBy() {
  return (
    <div className="flex flex-col gap-8">
      <h3 className="text-center text-xl font-medium opacity-50">
        Already used by awesome companies!
      </h3>

      <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">
        <img
          src="/used-by/remotion.png"
          alt="Remotion"
          className="max-h-[38px] dark:hidden"
        />

        <img
          src="/used-by/remotion-white.png"
          alt="Remotion"
          className="max-h-[38px] hidden dark:block"
        />

        <div className="flex items-center gap-2">
          <img
            src="/used-by/konvajs.png"
            alt="Konva"
            className="max-h-[38px]"
          />
          <div className="font-medium text-xl">Konvajs</div>
        </div>

        <div className="flex items-center gap-2">
          <img
            src="/used-by/270logo.svg"
            alt="270Degrees.nl"
            className="max-h-[38px]"
          />
          <div className="font-medium text-xl">270Degrees</div>
        </div>

        <div className="flex items-center gap-2 dark:hidden">
          <img
            src="/used-by/polotno.png"
            alt="Polotno"
            className="max-h-[38px]"
          />
          <div className="font-medium text-xl">Polotno</div>
        </div>

        <div className="items-center gap-2 hidden dark:flex">
          <img
            src="/used-by/polotno-white.png"
            alt="Polotno"
            className="max-h-[38px]"
          />
          <div className="font-medium text-xl">Polotno</div>
        </div>
      </div>
    </div>
  );
}

function Heading({ children }: PropsWithChildren) {
  return (
    <h3 className="text-center text-4xl md:text-5xl font-bold max-w-[300px] md:max-w-[640px] mx-auto font-radio-grotesk leading-[1.3]">
      {children}
    </h3>
  );
}

function HeadingHighlight({ children }: PropsWithChildren) {
  return (
    <span className="text-brand bg-brand-subtle px-4 rounded-lg md:leading-[1.4]">
      {children}
    </span>
  );
}

function HeadingDescription({ children }: PropsWithChildren) {
  return (
    <p className="text-center text-xl font-medium max-w-[760px] mx-auto py-8 opacity-60">
      {children}
    </p>
  );
}

function WorksBox({
  title,
  description,
  children,
}: { title: string; description: string } & PropsWithChildren) {
  return (
    <div className="p-6 rounded-2xl bg-canvas shadow-md flex-1 pb-10">
      <h4 className="text-2xl font-bold mb-2 font-radio-grotesk">{title}</h4>
      <p className="opacity-60 mb-8 leading-tight">{description}</p>

      {children}
    </div>
  );
}

function WorksChip({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="flex items-center gap-2 p-1 px-2 shadow rounded-md w-fit">
      <img src={icon} alt={label} className="w-4 h-4" />
      <div className="text-xs font-medium text-brand">{label}</div>
    </div>
  );
}

function WorksChipRow({ children }: PropsWithChildren) {
  return (
    <div className="flex items-center gap-2 justify-center">{children}</div>
  );
}

function IntegrateChip({ label, icon }: { label?: string; icon: string }) {
  return (
    <div className="flex items-center p-1 px-2 shadow rounded-md w-fit gap-1">
      <img src={icon} alt={label} className="w-4 h-4" />
      {label && <div className="text-sm font-medium text-brand">{label}</div>}
    </div>
  );
}

function CustomiseIcon({ src, rotate }: { src: string; rotate: number }) {
  return (
    <div
      className="flex items-center justify-center w-10 h-10 rounded-lg shadow-md border border-outline"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <img src={src} alt="Grok" className="max-w-[24px]" />
    </div>
  );
}

function WorksStep({
  img,
  title,
  children,
}: PropsWithChildren<{
  img: string;
  title: string;
}>) {
  return (
    <div className="flex flex-col gap-4 flex-1 items-center max-w-[400px]">
      <img src={img} alt="Works step 1" />

      <h4 className="text-2xl font-bold">{title}</h4>
      <p className="text-center text-lg">{children}</p>
    </div>
  );
}

function stepHighlightClassNames() {
  return cn(
    "border px-2 py-0.5 inline-flex items-center gap-1 rounded-full leading-none mx-1"
  );
}

function Works() {
  return (
    <div className="mt-32" id="how-it-works">
      <Heading>
        Works in <HeadingHighlight>three</HeadingHighlight> simple steps
      </Heading>

      <HeadingDescription>
        CrawlChat has a very simple workflow at its core. You can turn your docs
        into LLM ready for your community in three simple steps.
      </HeadingDescription>

      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
        {/* <WorksBox
          title="Add knowledge"
          description="Bring your docs to CrawlChat as a knowledge base. The LLMs will answer your community questions with the provided knowledge without any hallucination."
        >
          <div className="flex flex-col gap-6">
            <WorksChipRow>
              <WorksChip
                label="Knowledge Base"
                icon="/new-landing/notion.png"
              />
              <WorksChip
                label="Help Center"
                icon="/new-landing/help-center.png"
              />
            </WorksChipRow>
            <WorksChipRow>
              <WorksChip label="Website" icon="/new-landing/globe.png" />
              <WorksChip label="Documentation" icon="/new-landing/doc.png" />
            </WorksChipRow>
            <WorksChipRow>
              <WorksChip
                label="Technical Docs"
                icon="/new-landing/github.png"
              />
              <WorksChip label="Forumns" icon="/new-landing/signal.png" />
            </WorksChipRow>
            <WorksChipRow>
              <WorksChip
                label="Discord Channels"
                icon="/new-landing/discord.png"
              />
              <WorksChip label="Blog" icon="/new-landing/blogger.png" />
            </WorksChipRow>
          </div>
        </WorksBox>
        <WorksBox
          title="Integrate"
          description="You can integrate the LLM ready docs into your community as a “Ask AI” chat widget on your website, a Discord/Slack bot, and as a MCP server."
        >
          <div className="flex flex-col relative mb-8 md:mb-0">
            <div className="flex justify-center">
              <img
                src="new-landing/integrate-lines.png"
                className="w-[180px] translate-y-[32px] dark:opacity-20"
              />
            </div>

            <img
              src="/new-landing/docs.png"
              alt="Docs"
              className="w-20 h-20 absolute top-0 left-0 right-0 mx-auto"
            />

            <div className="flex justify-center gap-2 absolute left-[50%] bottom-0 translate-y-8 -translate-x-32">
              <IntegrateChip label="Ask AI" icon="/new-landing/ai.png" />
            </div>
            <div className="flex justify-center gap-2 absolute right-[50%] bottom-0 translate-y-8 translate-x-32">
              <IntegrateChip label="MCP" icon="/new-landing/mcp.png" />
            </div>
            <div className="flex justify-center gap-2 absolute left-[50%] -bottom-8 translate-y-6 -translate-x-10">
              <IntegrateChip icon="/new-landing/discord.png" />
            </div>
            <div className="flex justify-center gap-2 absolute right-[50%] -bottom-8 translate-y-6 translate-x-10">
              <IntegrateChip icon="/new-landing/slack.png" />
            </div>
          </div>
        </WorksBox>
        <WorksBox
          title="Customise"
          description="You get full control of how the integrations look like and also customise the AI behaviour with prompts, AI models, and multiple other settings."
        >
          <div className="flex flex-col gap-6">
            <div className="flex gap-16 justify-center">
              <CustomiseIcon src="/new-landing/chatgpt.png" rotate={10} />
              <CustomiseIcon src="/new-landing/google.png" rotate={-14} />
            </div>
            <div className="flex gap-2 justify-between">
              <CustomiseIcon src="/new-landing/grok.png" rotate={-16} />
              <CustomiseIcon src="/new-landing/anthropic.png" rotate={14} />
              <CustomiseIcon src="/new-landing/deepseek.png" rotate={8} />
            </div>
            <div className="bg-ash rounded-lg p-3 flex items-center gap-2 justify-between border border-outline border-dashed">
              <div className="font-medium text-brand">Custom prompt</div>
              <div>
                <img
                  src="/new-landing/square-setting.png"
                  alt="Setting"
                  className="w-6 h-6"
                />
              </div>
            </div>
          </div>
        </WorksBox> */}
        <WorksStep img="/new-landing/knowledge.png" title="Make knowledge base">
          Add your existing documents or web pages as knowledge base. You can{" "}
          <span
            className={cn(
              stepHighlightClassNames(),
              "text-purple-500 border-purple-500"
            )}
          >
            <TbSpider />
            scrape
          </span>{" "}
          your online documentation or{" "}
          <span
            className={cn(
              stepHighlightClassNames(),
              "text-green-500 border-green-500"
            )}
          >
            <TbFile />
            upload files
          </span>{" "}
          directly.
        </WorksStep>
        <WorksStep img="/new-landing/integrate.png" title="Integrate chatbot">
          You can connect the AI chatbot to your website, Discord, Slack. You
          can customise the bot UI and{" "}
          <span
            className={cn(
              stepHighlightClassNames(),
              "text-purple-500 border-purple-500"
            )}
          >
            <TbRobotFace />
            behaviour
          </span>{" "}
          of the bot
        </WorksStep>
        <WorksStep img="/new-landing/analyse.png" title="Analyse performance">
          View all the messages and conversations that the bot has had. You get
          to see the performance,{" "}
          <span
            className={cn(
              stepHighlightClassNames(),
              "text-green-500 border-green-500"
            )}
          >
            <TbScoreboard />
            scores
          </span>
          , and{" "}
          <span
            className={cn(
              stepHighlightClassNames(),
              "text-blue-500 border-blue-500"
            )}
          >
            <TbDatabase />
            data gaps
          </span>{" "}
          as well.
        </WorksStep>
      </div>
    </div>
  );
}

function Tabs({ children }: PropsWithChildren) {
  return (
    <div className="flex gap-2 items-center shadow-md w-fit p-2 rounded-2xl border border-outline">
      {children}
    </div>
  );
}

function Tab({
  children,
  active,
  onClick,
}: PropsWithChildren & { active?: boolean; onClick?: () => void }) {
  return (
    <div
      className={cn(
        "px-4 py-1 rounded-xl font-bold opacity-60 text-lg font-radio-grotesk border border-transparent hover:border-outline cursor-pointer",
        active && "bg-canvas shadow opacity-100 hover:border-transparent"
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function ImportKnowledgePreview({
  title,
  description,
  img,
}: {
  title: string;
  description: string;
  img: string;
}) {
  return (
    <div className="w-full bg-ash-subtle rounded-2xl bg-canvas bg-opacity-50 flex flex-col gap-4 p-4 border border-outline">
      <div className="flex flex-col gap-2">
        <p className="text-2xl font-bold">{title}</p>
        <p className="font-medium opacity-50">{description}</p>
      </div>
      <div className="w-full flex-1 bg-ash rounded-xl aspect-video">
        <img
          src={img}
          alt={title}
          className="w-full h-full object-cover rounded-md border border-outline"
        />
      </div>
    </div>
  );
}

function ImportKnowledge() {
  const [activeTab, setActiveTab] = useState("groups");
  const tabs = useMemo<
    Record<
      string,
      {
        title: string;
        description: string;
        img: string;
      }
    >
  >(
    () => ({
      groups: {
        title: "Groups",
        description:
          "Knowledge bases are maintained as groups for easy maintenance. You can set up auto updates on the groups & get analytics on each group.",
        img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/groups-gif.gif",
      },
      scrape: {
        title: "Scrape",
        description:
          "Scrape your docs website to get the knowledge base ready for your community. You can scrape your docs website to get the knowledge base ready for your community.",
        img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/scrape-gif.gif",
      },
      docusaurus: {
        title: "Docusaurus",
        description:
          "Quickly import your Docusaurus based docs to CrawlChat. Just give your docs URL and CrawlChat will load the docs as knowledge base and keep it updated automatically.",
        img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/scrape-gif.gif",
      },
    }),
    []
  );

  return (
    <div className="mt-32">
      <Heading>
        Knowledge bases for quick <HeadingHighlight>import</HeadingHighlight>
      </Heading>

      <HeadingDescription>
        CrawlChat has quick to import options for multiple sources that cover
        most of your use cases.
      </HeadingDescription>

      <div className="flex flex-col gap-6">
        <div className="flex justify-center">
          <Tabs>
            <Tab
              active={activeTab === "groups"}
              onClick={() => setActiveTab("groups")}
            >
              Groups
            </Tab>
            <Tab
              active={activeTab === "scrape"}
              onClick={() => setActiveTab("scrape")}
            >
              Scrape
            </Tab>
            <Tab
              active={activeTab === "docusaurus"}
              onClick={() => setActiveTab("docusaurus")}
            >
              Docusaurus
            </Tab>
          </Tabs>
        </div>

        <div className={cn("hidden", activeTab === "groups" && "block")}>
          <ImportKnowledgePreview
            title={"Groups"}
            description={
              "Knowledge bases are maintained as groups for easy maintenance. You can set up auto updates on the groups & get analytics on each group."
            }
            img={
              "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/groups-gif.gif"
            }
          />
        </div>
        <div className={cn("hidden", activeTab === "scrape" && "block")}>
          <ImportKnowledgePreview
            title={"Scrape"}
            description={
              "Scrape your docs website to get the knowledge base ready for your community. You can scrape your docs website to get the knowledge base ready for your community."
            }
            img={
              "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/scrape-gif.gif"
            }
          />
        </div>
        <div className={cn("hidden", activeTab === "docusaurus" && "block")}>
          <ImportKnowledgePreview
            title={"Docusaurus"}
            description={
              "Scrape your docs website to get the knowledge base ready for your community. You can scrape your docs website to get the knowledge base ready for your community."
            }
            img={
              "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/docusaurus-gif.gif"
            }
          />
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({
  flex,
  title,
  description,
  img,
}: {
  flex: number;
  title: string;
  description: string;
  img: string;
}) {
  return (
    <div
      className={
        "p-6 shadow-md border border-outline rounded-xl bg-canvas flex flex-col gap-6"
      }
      style={{ flex: flex }}
    >
      <div className="aspect-video bg-ash rounded-lg">
        <img
          src={img}
          alt={title}
          className="w-full h-full object-cover rounded-md"
        />
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-bold font-radio-grotesk">{title}</h3>
        <p className="opacity-50 font-medium text-lg">{description}</p>
      </div>
    </div>
  );
}

function Integrations() {
  return (
    <div className="mt-32">
      <Heading>
        Easy <HeadingHighlight>integrations</HeadingHighlight>
      </Heading>

      <HeadingDescription>
        CrawlChat provides multiple options to bring your docs to your community
        platforms easily. It takes only few minutes to integrate them
      </HeadingDescription>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-6">
          <IntegrationCard
            flex={1}
            title="Ask AI button"
            description="A drop in embed code to add the Ask AI button on your docs website. All the visitors to your docs can now quickly ask their question."
            img="/new-landing/integration-ask-ai.png"
          />
          <IntegrationCard
            flex={1}
            title="Discord bot"
            description="CrawlChat focuses on giving a wholesome integration experience by providing Discord bot that can answer questions from your community by just tagging it."
            img="/new-landing/integration-discord.png"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <IntegrationCard
            flex={1}
            title="Slack bot"
            description="CrawlChat focuses on giving a wholesome integration experience by providing Slack bot that can answer questions from your community by just tagging it."
            img="/new-landing/integration-slack.png"
          />
          <IntegrationCard
            flex={1}
            title="MCP server"
            description="You will not be missed by the next gen developers. CrawlChat provides the MCP server out of the box."
            img="/new-landing/integration-mcp.png"
          />
        </div>
      </div>
    </div>
  );
}

function ChatWidgetFeature({
  active,
  title,
  description,
  img,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  img: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 border border-transparent hover:border-outline gap-2 flex flex-col",
        "cursor-pointer",
        active && "bg-canvas shadow-md hover:border-transparent"
      )}
      onClick={onClick}
    >
      <h3 className="text-2xl font-bold font-radio-grotesk flex items-center gap-2">
        <img src={img} alt={title} className="w-6 h-6" />
        {title}
      </h3>
      <p className="opacity-50 font-medium leading-tight">{description}</p>
    </div>
  );
}

function ChatWidget() {
  const [activeTab, setActiveTab] = useState("sources");

  return (
    <div className="mt-32">
      <Heading>
        <HeadingHighlight>Chat</HeadingHighlight> widget
      </Heading>

      <HeadingDescription>
        The chat widget comes with all tools required. Your community finds the
        perfect answers right from your docs website from one click exactly what
        they want
      </HeadingDescription>

      <div className="flex flex-col md:flex-row gap-10">
        <div className="flex-1 flex flex-col gap-4">
          <ChatWidgetFeature
            active={activeTab === "sources"}
            title="Custom knowledge base"
            description="All the answers on the chat widget are provided by the resources that the answer is fetched from so that your community can always go find more help if required."
            img="/new-landing/archive-active.png"
            onClick={() => setActiveTab("sources")}
          />
          <ChatWidgetFeature
            active={activeTab === "code"}
            title="Code blocks"
            description="CrawlChat supports showing code blocks and your community can just copy and paste the generated code to their workflow."
            img="/new-landing/app-programming.png"
            onClick={() => setActiveTab("code")}
          />
          <ChatWidgetFeature
            active={activeTab === "pin"}
            title="Pin & Share"
            description="Your community can pin and share the important answers so that they can always come back and find the critical help with ease"
            img="/new-landing/pin.png"
            onClick={() => setActiveTab("pin")}
          />
        </div>
        <div className="flex-1 bg-ash-strong rounded-2xl shadow-md border border-outline aspect-square overflow-hidden">
          <img
            src={`/new-landing/widget-${activeTab}.png`}
            className="w-full h-full aspect-square"
          />
        </div>
      </div>
    </div>
  );
}

function ToolsRow({ children }: PropsWithChildren) {
  return <div className="grid grid-cols-1 md:grid-cols-3">{children}</div>;
}

function ToolItem({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string | ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex-1 flex flex-col gap-2 p-6 border-opacity-60 border-outline",
        "md:border-r border-b no-border-last-3 no-border-every-3 last:border-b-0"
      )}
    >
      <div className="flex flex-col gap-2">
        {typeof icon === "string" ? (
          <img src={icon} alt={title} className="w-6 h-6" />
        ) : (
          <Box>
            <Text
              fontSize={"32px"}
              color={"brand.fg"}
              bg={"brand.subtle"}
              w="fit"
              p={4}
              rounded={"full"}
            >
              {icon}
            </Text>
          </Box>
        )}
        <h3 className="text-xl font-bold font-radio-grotesk">{title}</h3>
      </div>
      <p className="opacity-50 font-medium leading-tight">{description}</p>
    </div>
  );
}

function Tools() {
  return (
    <div className="mt-32" id="features">
      <Heading>
        All the <HeadingHighlight>tools</HeadingHighlight> to reduce your
        support tickets
      </Heading>

      <HeadingDescription>
        CrawlChat cuts support tickets by letting users instantly chat with your
        docs, getting answers without needing human help right from your site,
        Discord, or Slack.
      </HeadingDescription>

      <div className="bg-canvas rounded-2xl border border-outline">
        <ToolsRow>
          <ToolItem
            title="Instant answers"
            description="CrawlChat lets users ask questions and get immediate answers from your docs, guides, or FAQs, no searching or waiting. This reduces basic support requests and improves self-service."
            icon={<TbMessage />}
          />
          <ToolItem
            title="Less Repetitive Questions"
            description="CrawlChat answers frequent questions directly from your documentation, reducing the need for users to contact support for the same issues and letting your team focus on complex tasks."
            icon={<TbArrowsShuffle />}
          />
          <ToolItem
            title="24/7 Availability"
            description="CrawlChat is always active, helping users anytime—day or night—so they don’t have to wait for support teams, reducing off-hour ticket volume."
            icon={<TbClock />}
          />
          <ToolItem
            title="Analytics"
            description="You get a wide range of analytics for your docs and community. The daily messages chart, score distribution and many more that give your more visibility into your docs and the community"
            icon={<TbChartBar />}
          />
          <ToolItem
            title="Discord & Slack bots"
            description="CrawlChat works inside Discord and Slack, letting users ask questions and get instant answers from your docs—just by tagging the bot. It’s like support, right in chat."
            icon={<TbBrandDiscord />}
          />
          <ToolItem
            title="Customisation"
            description="CrawlChat lets you customize the chat widget’s look and tone. With custom prompts, you guide how the AI responds—tailoring answers to fit your brand and support needs."
            icon={<TbSettings />}
          />
        </ToolsRow>
      </div>
    </div>
  );
}

type PricingItem = {
  text: string;
  excluded?: boolean;
};

function PricingBox({
  popular,
  title,
  description,
  price,
  items,
  free,
  href,
}: {
  popular?: boolean;
  title: string;
  description: string;
  price: string;
  items: PricingItem[];
  free?: boolean;
  href?: string;
}) {
  return (
    <div
      className={cn(
        "flex-1 bg-canvas shadow-md border border-outline rounded-2xl relative",
        popular && "bg-brand-subtle bg-opacity-60 rounded-tl-none"
      )}
    >
      {popular && (
        <div
          className={cn(
            "bg-brand-subtle border border-outline absolute top-0 left-[-1px] translate-y-[-100%]",
            "text-sm text-brand px-2 py-1 rounded-t-lg font-medium flex items-center gap-2"
          )}
        >
          <img src="/new-landing/crown.png" alt="Popular" className="w-4 h-4" />
          Popular
        </div>
      )}

      <div
        className={cn(
          "p-6 border-b border-outline",
          popular && "border-brand border-opacity-10"
        )}
      >
        <h4 className="text-2xl font-bold font-radio-grotesk">{title}</h4>
        <p className="opacity-50 font-medium">{description}</p>
      </div>
      <div className="p-6 gap-6 flex flex-col">
        <div className="flex gap-1 items-end">
          <p className="text-4xl font-bold font-radio-grotesk">{price}</p>
          <p className="opacity-50 font-medium mb-1">/month</p>
        </div>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.text} className="flex gap-2 items-center">
              <img
                src={`/new-landing/${
                  item.excluded ? "bold-cross" : "bold-check"
                }.png`}
                alt="Check"
                className="w-4 h-4"
              />
              <span className="font-medium">{item.text}</span>
            </li>
          ))}
        </ul>
        <div className="w-full">
          <Button
            className="w-full"
            variant={popular ? "solid" : "outline"}
            href={href}
          >
            {free ? "Get started" : "Purchase"}
            <TbArrowRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Pricing() {
  return (
    <div className="mt-32" id="pricing">
      <Heading>
        <HeadingHighlight>Pricing</HeadingHighlight> for everyone
      </Heading>

      <div className="flex flex-col md:flex-row md:gap-6 gap-10 mt-20">
        <PricingBox
          free
          title="Free"
          description="For personal use"
          price="$0"
          items={[
            { text: "100 page scrapes" },
            { text: "100 message credits" },
            { text: "API not available", excluded: true },
            { text: "MCP not available", excluded: true },
            { text: "Discord bot", excluded: true },
            { text: "Discord drafting", excluded: true },
            { text: "GitHub issues", excluded: true },
          ]}
          href="/login"
        />
        <PricingBox
          title="Starter"
          description="Start your journey with CrawlChat"
          price="$29"
          items={[
            { text: "5000 scrapes/month" },
            { text: "7000 message credits/month" },
            { text: "API available" },
            { text: "MCP available" },
            { text: "Discord bot" },
            { text: "Discord drafting", excluded: true },
            { text: "GitHub issues", excluded: true },
          ]}
          href="https://beestack.lemonsqueezy.com/buy/a13beb2a-f886-4a9a-a337-bd82e745396a"
        />
        <PricingBox
          title="Pro"
          description="For power users and teams"
          popular
          price="$79"
          items={[
            { text: "14,000 scrapes/month" },
            { text: "20,000 message credits/month" },
            { text: "API available" },
            { text: "MCP available" },
            { text: "Discord bot" },
            { text: "Discord drafting" },
            { text: "GitHub issues" },
          ]}
          href="https://beestack.lemonsqueezy.com/buy/3a487266-72de-492d-8884-335c576f89c0"
        />
      </div>
    </div>
  );
}

function Testimonials() {
  return (
    <div className="mt-32">
      <Heading>
        People <HeadingHighlight>love</HeadingHighlight> CrawlChat
      </Heading>

      <div className="flex flex-col md:flex-row gap-6 mt-20">
        <div>
          <div>
            <blockquote className="twitter-tweet">
              <p lang="en" dir="ltr">
                MCP, llms.txt and{" "}
                <a href="https://t.co/wvTaGlv99L">https://t.co/wvTaGlv99L</a>{" "}
                are now live!
                <br />
                <br />
                Thanks to{" "}
                <a href="https://twitter.com/pramodk73?ref_src=twsrc%5Etfw">
                  @pramodk73
                </a>{" "}
                and{" "}
                <a href="https://t.co/dv2PDLzt2V">https://t.co/dv2PDLzt2V</a>{" "}
                for getting us up to speed with AI integrations.{" "}
                <a href="https://t.co/Sornu9aIFi">https://t.co/Sornu9aIFi</a>
              </p>
              &mdash; Jonny Burger (@JNYBGR){" "}
              <a href="https://twitter.com/JNYBGR/status/1899786274635927674?ref_src=twsrc%5Etfw">
                March 12, 2025
              </a>
            </blockquote>
            <script async src="https://platform.twitter.com/widgets.js" />
          </div>
        </div>
        <div>
          <div>
            <blockquote className="twitter-tweet">
              <p lang="en" dir="ltr">
                Integrated{" "}
                <a href="https://t.co/uKP4sKdbjV">https://t.co/uKP4sKdbjV</a>{" "}
                into the new Konva docs – hats off to{" "}
                <a href="https://twitter.com/pramodk73?ref_src=twsrc%5Etfw">
                  @pramodk73
                </a>{" "}
                for making it insanely useful.
                <br />
                <br />
                It now powers:
                <br />- &quot;Ask AI&quot; widget on site
                <br />- MCP server for docs
                <br />- Discord bot for community
                <br />
                <br />
                Smarter docs. Better support.
              </p>
              &mdash; Anton Lavrenov (@lavrton){" "}
              <a href="https://twitter.com/lavrton/status/1915467775734350149?ref_src=twsrc%5Etfw">
                April 24, 2025
              </a>
            </blockquote>{" "}
            <script async src="https://platform.twitter.com/widgets.js" />
          </div>
          <div>
            <iframe
              src="https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7323678686812020736"
              height="879"
              width="100%"
              frameBorder="0"
              allowFullScreen
              title="Embedded post"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CTA() {
  return (
    <div className="mt-32">
      <div className="w-full bg-gradient-to-b from-canvas to-ash shadow-md rounded-2xl py-20 px-10 relative">
        {/* <div className="absolute top-[10%] md:top-[20%] left-[4%] md:left-[8%] rotate-[-24deg] scale-120 opacity-50">
          <IntegrateChip label="Ask AI" icon="/new-landing/ai.png" />
        </div>

        <div className="absolute top-[80%] left-[80%] rotate-[24deg] scale-120 opacity-50">
          <IntegrateChip label="MCP" icon="/new-landing/mcp.png" />
        </div>

        <div className="absolute top-[20%] left-[90%] rotate-[24deg] scale-150 opacity-50">
          <IntegrateChip icon="/new-landing/discord.png" />
        </div>

        <div className="absolute top-[80%] left-[8%] rotate-[-24deg] scale-150 opacity-50">
          <IntegrateChip icon="/new-landing/slack.png" />
        </div> */}

        <h2 className="font-radio-grotesk text-[42px] md:text-[42px] leading-[1.2] font-bold text-center max-w-[800px] mx-auto">
          Make your documents and knowledge base be powered by AI now!
        </h2>

        <div className="flex justify-center mt-8">
          <a href="/login" className={ctaClassNames(true)}>
            Get started
            <TbArrowRight />
          </a>
        </div>
      </div>
    </div>
  );
}

function FooterLink({ children, href }: PropsWithChildren<{ href: string }>) {
  return (
    <a href={href} className="opacity-60 font-medium hover:underline">
      {children}
    </a>
  );
}

export function Footer() {
  return (
    <div className="bg-canvas mt-32 border-t border-outline">
      <Container>
        <div className="py-8 flex flex-col md:flex-row gap-10">
          <div className="flex-[2] flex flex-col gap-4">
            <Logo />
            <p className="font-medium opacity-60">
              AI Chatbot for your knowledge base and documentation
            </p>
            <p className="opacity-50 text-xs mt-4 font-medium">
              © 2025 CrawlChat
            </p>
          </div>
          <div className="flex-[2]">
            <ul className="flex flex-col gap-4">
              <li>
                <FooterLink href="/blog/boosting-developer-experience-with-crawlchat">
                  Boosting Developer Experience - DX
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/blog/how-to-add-ask-ai-chatbot-to-docusaurus-site">
                  How to integrate with Docusaurus
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/blog/how-to-embed-ai-chatbot">
                  How to add AI Chatbot for your docs
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/blog/how-remotion-uses-crawlchat">
                  Documentation - Use case
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/blog/how-to-setup-mcp-for-your-documentation">
                  Setup MCP server
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/blog/how-discord-bot-helps">
                  How Discord Bot helps?
                </FooterLink>
              </li>
            </ul>
          </div>
          <div className="flex-[1]">
            <ul className="flex flex-col gap-4">
              <li>
                <FooterLink href="/">Home</FooterLink>
              </li>
              <li>
                <FooterLink href="/#pricing">Pricing</FooterLink>
              </li>
              <li>
                <FooterLink href="/#features">Features</FooterLink>
              </li>
              <li>
                <FooterLink href="https://guides.crawlchat.app">
                  Guides
                </FooterLink>
              </li>
              <li>
                <FooterLink href="https://crawlchat.features.vote/roadmap">
                  Roadmap
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/blog">Blog</FooterLink>
              </li>
              <li>
                <FooterLink href="/discord-bot">Discord bot</FooterLink>
              </li>
            </ul>
          </div>
          <div className="flex-[1]">
            <ul className="flex flex-col gap-4">
              <li>
                <FooterLink href="/terms">Terms</FooterLink>
              </li>
              <li>
                <FooterLink href="/policy">Privacy policy</FooterLink>
              </li>
            </ul>

            <ul className="flex gap-6 mt-4">
              <li>
                <a href="mailto:support@crawlchat.app">
                  <img
                    src="/new-landing/mail.png"
                    alt="Mail"
                    className="w-4 h-4"
                  />
                </a>
              </li>
              <li>
                <a href="https://x.com/pramodk73">
                  <img src="/new-landing/x.png" alt="X" className="w-4 h-4" />
                </a>
              </li>
              <li>
                <a href="https://discord.gg/zW3YmCRJkC">
                  <TbBrandDiscord />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </Container>
    </div>
  );
}

export function Nav() {
  return (
    <nav className="flex items-center justify-between gap-2 lg:py-6">
      <Logo />

      <div className="flex items-center gap-8">
        <div className="items-center gap-8 hidden md:flex">
          <NavLink href="/#how-it-works">How it works</NavLink>
          <NavLink href="/#features">Features</NavLink>
          <NavLink href="/#pricing">Pricing</NavLink>
          <NavLink href="/public-bots">Public bots</NavLink>
        </div>

        <Button href="/login">Login</Button>
      </div>
    </nav>
  );
}

export function ctaClassNames(primary: boolean) {
  return cn(
    "text-2xl border-2 border-brand px-8 py-4 rounded-xl font-medium flex items-center gap-2 transition-all hover:translate-y-[-2px]",
    !primary && "text-brand hover:bg-brand-subtle",
    primary && "bg-brand text-canvas"
  );
}

function Hero() {
  function handleAskCrawlChat() {
    (window as any).crawlchatEmbed.show();
  }

  return (
    <div className="py-8">
      <h1 className="font-radio-grotesk text-[42px] md:text-[56px] leading-[1.2] font-bold text-center max-w-[800px] mx-auto">
        <span className="text-brand">AI Chatbot</span> for your knowledge base
        and documentation
      </h1>

      <h2 className="text-center text-xl max-w-[600px] mx-auto mt-8">
        CrawlChat turns your documentation and other knowledge sources into a AI
        chatbot that you can connect on your{" "}
        <span className="bg-red-50 text-red-500 border border-red-500 px-3 py-1 inline-flex m-1 rounded-full leading-none items-center gap-1">
          <TbWorld />
          Website
        </span>
        <span className="hidden">,</span>{" "}
        <a
          className="bg-green-50 text-green-500 border border-green-500 px-3 py-1 inline-flex m-1 rounded-full leading-none items-center gap-1"
          href="/discord-bot"
        >
          <TbBrandDiscord />
          Discord
        </a>
        <span className="hidden">,</span> or{" "}
        <span className="bg-purple-50 text-purple-500 border border-purple-500 px-3 py-1 inline-flex m-1 rounded-full leading-none items-center gap-1">
          <TbBrandSlack />
          Slack
        </span>
        <span className="hidden">.</span>
      </h2>

      <div className="flex justify-center gap-4 my-8 flex-wrap">
        <button className={ctaClassNames(false)} onClick={handleAskCrawlChat}>
          <TbMessage />
          Ask CrawlChat
        </button>
        <a className={ctaClassNames(true)} href="/login">
          Create your chatbot
          <TbArrowRight />
        </a>
      </div>

      {/* <DemoWindow /> */}
    </div>
  );
}

export function LandingPage({ children }: PropsWithChildren) {
  return (
    <div className="bg-ash font-aeonik">
      <div className="hidden md:block aspect-[1440/960] w-full bg-[url('/new-landing/clouds.png')] dark:bg-[url('/new-landing/clouds-dark.png')] bg-contain bg-no-repeat absolute top-0 left-0">
        <div className="w-full h-full bg-gradient-to-b from-[rgba(246,246,245,0)] to-ash"></div>
      </div>

      <div className="relative">{children}</div>
    </div>
  );
}

export default function LandingV2({ loaderData }: Route.ComponentProps) {
  return (
    <LandingPage>
      <Container>
        <Nav />
      </Container>

      <Container>
        <Hero />
      </Container>

      <Container>
        <UsedBy />
      </Container>

      <Container>
        <Stats
          messagesThisWeek={loaderData.messagesThisWeek}
          messagesDay={loaderData.messagesDay}
          messagesMonth={loaderData.messagesMonth}
        />
      </Container>

      <Container>
        <Works />
      </Container>

      <Container>
        <Integrations />
      </Container>

      <Container>
        <ChatWidget />
      </Container>

      <Container>
        <Tools />
      </Container>

      <Container>
        <Pricing />
      </Container>

      <Container>
        <Testimonials />
      </Container>

      <Container>
        <CTA />
      </Container>

      <Footer />
    </LandingPage>
  );
}

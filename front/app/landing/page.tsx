import type { Route } from "./+types/page";
import type { PropsWithChildren, ReactNode } from "react";
import { useState } from "react";
import {
  TbArrowDown,
  TbArrowRight,
  TbArrowsShuffle,
  TbBook,
  TbBook2,
  TbBrandDiscord,
  TbBrandGithub,
  TbBrandLinkedin,
  TbBrandNotion,
  TbBrandSlack,
  TbBrandX,
  TbChartBar,
  TbChartBarOff,
  TbChartLine,
  TbChevronDown,
  TbChevronRight,
  TbChevronUp,
  TbCircleCheckFilled,
  TbCircleFilled,
  TbCircleXFilled,
  TbClock,
  TbCode,
  TbColorSwatch,
  TbCrown,
  TbDashboard,
  TbDatabase,
  TbFile,
  TbMail,
  TbMessage,
  TbPlug,
  TbRobotFace,
  TbScoreboard,
  TbSettings,
  TbShare,
  TbSpider,
  TbThumbUp,
  TbUpload,
  TbUserHeart,
  TbVideo,
  TbWorld,
} from "react-icons/tb";
import { prisma } from "libs/prisma";
import { track } from "~/pirsch";
import {
  PLAN_FREE,
  PLAN_PRO,
  PLAN_STARTER,
  PLAN_HOBBY,
  type Plan,
} from "libs/user-plan";
import { useLoaderData } from "react-router";
import { cache as changelogCache } from "~/changelog/fetch";
import { makeMeta } from "~/meta";
import cn from "@meltdownjs/cn";
import { SiDocusaurus } from "react-icons/si";
import { FaConfluence } from "react-icons/fa";
import { Logo } from "~/dashboard/logo";

export function meta() {
  return makeMeta({
    title: "CrawlChat - AI Chatbot for your tech documentation",
    description:
      "Make AI chatbot from your tech documentation that can answer any question from your community. Embed it in your website, Discord, or Slack.",
  });
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

  const focusChangelog = changelogCache
    .get()
    .filter((post) => post.tags?.includes("focus"))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  return {
    messagesThisWeek: cache.messagesThisWeek,
    messagesDay: cache.messagesDay,
    messagesMonth: cache.messagesMonth,
    freePlan: PLAN_FREE,
    starterPlan: PLAN_STARTER,
    proPlan: PLAN_PRO,
    hobbyPlan: PLAN_HOBBY,
    focusChangelog,
  };
}

export function Container({ children }: PropsWithChildren) {
  return (
    <div className="flex justify-center">
      <div className="max-w-[1200px] w-full p-4 px-8 md:px-4">{children}</div>
    </div>
  );
}

function NavLink({
  children,
  href,
  tooltip,
}: PropsWithChildren<{ href: string; tooltip?: string }>) {
  return (
    <a href={href} className="font-medium hover:underline relative">
      {children}
      {tooltip && (
        <div
          className={cn(
            "absolute top-0 right-0 text-[8px]",
            "bg-secondary text-secondary-content px-2 py-[2px] rounded-full",
            "translate-x-[20%] -translate-y-[80%]"
          )}
        >
          {tooltip}
        </div>
      )}
    </a>
  );
}

function Button({
  children,
  className,
  variant = "outline",
  href,
  onClick,
}: PropsWithChildren & {
  className?: string;
  variant?: "solid" | "outline";
  href?: string;
  onClick?: () => void;
}) {
  return (
    <a
      className={cn(
        "font-medium border text-primary border-primary rounded-xl px-6 py-1 flex items-center justify-center gap-2",
        "cursor-pointer hover:bg-primary hover:text-primary-content transition-all",
        variant === "solid" && "bg-primary text-primary-content",
        className
      )}
      href={href}
      onClick={onClick}
    >
      {children}
    </a>
  );
}

function StatsItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex gap-4 py-6 px-6 items-center border-b border-base-300 last:border-b-0">
      <div className="flex-1 flex">{label}</div>
      <div className="text-5xl md:text-6xl font-bold font-radio-grotesk">
        {value}
      </div>
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
        <div className="text-md md:text-xl font-medium px-6 py-3 shadow-md rounded-2xl bg-base-100 w-fit flex items-center gap-4 -rotate-[4deg]">
          <div className="w-3 h-3 bg-green-500 rounded-full outline-2 outline-green-300" />
          Serving the community
        </div>
        <h3 className="text-4xl md:text-5xl font-radio-grotesk font-bold leading-[1.2]">
          Answering <br />
          <span className="text-primary">questions</span> <br />
          continuously
        </h3>
      </div>

      <div className="flex-1 shadow-md bg-base-100 rounded-2xl">
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

        {/* <img
          src="/used-by/trustworks.png"
          alt="Trustworks"
          className="max-h-[38px] dark:hidden"
        />

        <img
          src="/used-by/trustworks-white.png"
          alt="Trustworks"
          className="max-h-[38px] hidden dark:block"
        /> */}

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

        <div className="bg-gray-900 rounded-full p-4 px-6 pb-3">
          <img
            src="/used-by/postiz.svg"
            alt="Postiz"
            className="max-h-[24px]"
          />
        </div>
      </div>
    </div>
  );
}

export function Heading({ children }: PropsWithChildren) {
  return (
    <h3 className="text-center text-4xl md:text-5xl max-w-[300px] md:max-w-[640px] mx-auto font-radio-grotesk leading-[1.3]">
      {children}
    </h3>
  );
}

export function HeadingHighlight({ children }: PropsWithChildren) {
  return (
    <span className="text-primary bg-primary-content px-4 rounded-lg md:leading-[1.4]">
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
      <div
        className={cn(
          "max-w-[300px] mx-auto rounded-2xl overflow-hidden",
          "border border-primary mb-4"
        )}
      >
        <img src={img} alt={title} className="w-full h-full" />
      </div>

      <h4 className="text-2xl font-radio-grotesk">{title}</h4>
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

      <div className="flex flex-col md:flex-row gap-16 items-center md:items-start">
        <WorksStep
          img="/new-landing/knowledge-base.png"
          title="Make knowledge base"
        >
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
        <WorksStep
          img="/new-landing/integrate-chatbot.png"
          title="Integrate chatbot"
        >
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
        <WorksStep
          img="/new-landing/analyse-performance.png"
          title="Analyse performance"
        >
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

function Badge({ children }: PropsWithChildren) {
  return (
    <div className="flex items-center gap-2 justify-center mb-4">
      <div className="badge badge-secondary badge-soft badge-lg">
        <TbCircleFilled size={12} />
        {children}
      </div>
    </div>
  );
}

function ClickableFeature({
  active,
  title,
  description,
  img,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon?: ReactNode;
  img?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 border border-transparent hover:border-base-300 gap-2 flex flex-col",
        "cursor-pointer",
        active && "bg-base-100 shadow-md hover:border-transparent"
      )}
      onClick={onClick}
    >
      <h3 className="text-2xl font-radio-grotesk flex items-center gap-2">
        {icon && <div className="text-2xl">{icon}</div>}
        {img && <img src={img} alt={title} className="w-6 h-6" />}
        {title}
      </h3>
      <p className="opacity-50 font-medium leading-tight">{description}</p>
    </div>
  );
}

function FeaturesWithImage({
  trackName,
  features,
  left,
}: {
  trackName: string;
  features: {
    title: string;
    description: string;
    img: string;
    key: string;
    icon?: ReactNode;
  }[];
  left?: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState(features[0].key);

  function handleClick(tab: string) {
    track(trackName, {
      tab,
    });
    setActiveTab(tab);
  }

  return (
    <div className="flex flex-col md:flex-row gap-10">
      <div className="flex-1 flex flex-col gap-4">
        {features.map((feature) => (
          <ClickableFeature
            active={activeTab === feature.key}
            title={feature.title}
            description={feature.description}
            icon={feature.icon}
            onClick={() => handleClick(feature.key)}
          />
        ))}
        {left}
      </div>
      <div
        className={cn(
          "flex-1 bg-ash-strong rounded-2xl shadow-md border",
          "border-base-300 aspect-square overflow-hidden",
          "w-full aspect-square h-fit"
        )}
      >
        <img
          src={features.find((feature) => feature.key === activeTab)?.img}
          className="w-full"
        />
      </div>
    </div>
  );
}

function ChannelWidget() {
  return (
    <div className="mt-32">
      <Badge>Use case</Badge>

      <Heading>
        <HeadingHighlight>24x7 assistant</HeadingHighlight> on your website
      </Heading>

      <HeadingDescription>
        When you are running a global community with a lot of documentation to
        go through, you need to provide a 24x7 assistant to your community so
        that they can get the answers they need without waiting for you to
        respond.
      </HeadingDescription>

      <FeaturesWithImage
        trackName="channel-widget"
        features={[
          {
            title: "Embed on your website",
            description:
              "You can embed the web chatbot on your website under few minutes. You need to copy the embed code that CrawlChat provides and paste it on your website. You instantly get an AI assistant on your website that can handle most of your support queries.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/channels/4-min.png",
            key: "embed",
            icon: <TbPlug />,
          },
          {
            title: "Customise",
            description:
              "You can customise the chatbot's look and feel, and also the tone of the responses to match your brand and support style. You can add your own colors, logo of your brand, labels on the chatbot, and you can customise the behaviour of the chatbot using the AI prompts.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/channels/5-min.png",
            key: "customise",
            icon: <TbColorSwatch />,
          },
          {
            title: "Human support",
            description:
              "CrawlChat respects the user and understands that it might not have answers for all the support queries. Your users can always reach out to you via the support tickets. The chatbot itself prompts the user that it does not have answer and asks to create a support ticket by providing email right from the chat screen.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/channels/6-min.png",
            key: "human-support",
            icon: <TbUserHeart />,
          },
        ]}
      />
    </div>
  );
}

function ChannelDiscord() {
  return (
    <div className="mt-32">
      <Badge>Use case</Badge>

      <Heading>
        Ask AI on <HeadingHighlight>Discord</HeadingHighlight>
      </Heading>

      <HeadingDescription>
        It is quite common for most of the tech companies to have a Discord
        server where their community hangs out. It became a necessity to have an
        AI bot on Discord to answer community questions. CrawlChat does that out
        of the box.
      </HeadingDescription>

      <FeaturesWithImage
        trackName="channel-discord"
        features={[
          {
            title: "Tag the bot",
            description:
              "Once you add the CrawlChat bot to your Discord server, anyone on the Discord server can resolve their queries by just tagging the bot @crawlchat. It uses the same knowledge base you would have in the collection. On the admin side, all the discord messages are tagged with Discord channel.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/channels/1-min.png",
            key: "tag",
            icon: <TbBrandDiscord />,
          },
          {
            title: "Sources",
            description:
              "The bot attaches the sources it uses to answer the question so that the users can find more help from your documentation. This works the same for the Web chatbot and the Slack bot as well. You can also configure it to reply the answers as a thread for clutter free channels.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/channels/2-min.png",
            key: "sources",
            icon: <TbBook />,
          },
          {
            title: "Learn & Rate",
            description:
              "It is evident that the bot might get wrong at times and the moderators might give correct answers. You can make the bot learn these correct answers from the Discord server itself. You can react to the correct messages with 🧩 to make the bot learn the message. You users can also react with 👍 and 👎 to rate the message that you can view from the dashboard and take necessary actions.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/channels/3-min.png",
            key: "learn",
            icon: <TbThumbUp />,
          },
        ]}
        left={
          <div className="p-4 text-base-content/50">
            Learn more about{" "}
            <a href="/discord-bot" className="link link-primary link-hover">
              Discord bot
            </a>
          </div>
        }
      />
    </div>
  );
}

function ChannelMCP() {
  return (
    <div className="mt-32">
      <Badge>Use case</Badge>

      <Heading>
        You docs on AI apps as an <HeadingHighlight>MCP</HeadingHighlight>{" "}
        server
      </Heading>

      <HeadingDescription>
        The chat widget comes with all tools required. Your community finds the
        perfect answers right from your docs website from one click exactly what
        they want
      </HeadingDescription>

      <FeaturesWithImage
        trackName="channel-mcp"
        features={[
          {
            title: "Distribute",
            description:
              "Any AI model would have a cut off date and most probably would not know about your documentation. It is important to provide the docs as context for AI apps such as Cursor, Claude Code, Windsurf etc. You can share the MCP server with your community that provides tools to search through your docs by eht AI apps. This increase the accuracy of the AI apps significantly.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/channels/8-min.png",
            key: "sources",
            icon: <TbShare />,
          },
          {
            title: "Happy developers",
            description:
              "Developers these days spend more time asking AI than finding required help browsing through hunders of pages. MCP server makes it even better that they get the help from their favorite AI app without leaving their workspace. CrawlChat enables you to improve your developers efficiency significantly.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/channels/7-min.png",
            key: "code",
            icon: <TbCode />,
          },
        ]}
      />
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
        "flex-1 flex flex-col gap-2 p-6 border-opacity-60 border-base-300",
        "md:border-r border-b no-border-last-3 no-border-every-3 last:border-b-0"
      )}
    >
      <div className="flex flex-col gap-2">
        {typeof icon === "string" ? (
          <img src={icon} alt={title} className="w-6 h-6" />
        ) : (
          <div>
            <div
              className={cn(
                "text-3xl bg-primary-content p-4 rounded-full",
                "text-primary w-fit border border-primary/20"
              )}
            >
              {icon}
            </div>
          </div>
        )}
        <h3 className="text-xl font-radio-grotesk">{title}</h3>
      </div>
      <p className="opacity-50 font-medium leading-tight">{description}</p>
    </div>
  );
}

function Tools() {
  return (
    <div className="mt-32" id="features">
      <Heading>
        All the <HeadingHighlight>AI tools</HeadingHighlight> to power up your
        technical docs
      </Heading>

      <HeadingDescription>
        CrawlChat cuts technical queries by letting users instantly chat with
        your docs, getting answers without needing human help right from your
        website, Discord, or Slack.
      </HeadingDescription>

      <div className="bg-base-100 rounded-2xl border border-base-300">
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
  payLabel,
  onClick,
}: {
  popular?: boolean;
  title: string;
  description: string;
  price: string;
  items: PricingItem[];
  free?: boolean;
  href?: string;
  payLabel?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex-1 bg-base-100 shadow-md border border-base-300 rounded-2xl relative",
        popular && "bg-primary text-primary-content"
      )}
    >
      {popular && (
        <div
          className={cn(
            "bg-primary-subtle border border-base-300 absolute",
            "translate-y-[-40%] top-0 right-0 translate-x-[10%]",
            "text-sm text-primary px-3 py-2 font-medium flex items-center gap-2 rounded-xl",
            "bg-base-200 shadow-2xl"
          )}
        >
          <TbCrown />
          Popular
        </div>
      )}

      <div
        className={cn(
          "p-6 border-b border-base-300",
          popular && "border-base-100/20"
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
              {item.excluded && (
                <span className="text-error">
                  <span className="w-0 h-0 block overflow-hidden">
                    Excluded
                  </span>
                  <TbCircleXFilled size={20} />
                </span>
              )}
              {!item.excluded && (
                <span
                  className={cn(
                    "text-success",
                    popular && "text-primary-content"
                  )}
                >
                  <TbCircleCheckFilled size={20} />
                </span>
              )}
              <span className="font-medium">{item.text}</span>
            </li>
          ))}
        </ul>
        <div className="w-full">
          <Button
            className={cn(
              "w-full text-xl p-2",
              popular &&
                "border-base-100 text-base-100 hover:bg-base-100 hover:text-primary"
            )}
            variant={"outline"}
            href={!onClick ? href : undefined}
            onClick={() => onClick?.()}
          >
            {payLabel ?? (free ? "Try it out" : "Purchase")}
            <TbArrowRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PricingBoxes({
  freePlan,
  starterPlan,
  proPlan,
  hobbyPlan,
  onClick,
}: {
  freePlan?: Plan;
  starterPlan: Plan;
  proPlan: Plan;
  hobbyPlan: Plan;
  onClick?: (planId: string) => void;
}) {
  return (
    <>
      {freePlan && (
        <PricingBox
          free
          title="Free"
          description="Try it out now"
          price={`$${freePlan.price}`}
          items={[
            { text: `${freePlan.credits.scrapes} pages` },
            { text: `${freePlan.credits.messages} message credits` },
            { text: `${freePlan.limits.scrapes} collection` },
            { text: `${freePlan.limits.teamMembers} team member` },
            { text: "Base AI models", excluded: true },
            { text: "Support tickets", excluded: true },
            { text: "MCP server", excluded: true },
            { text: "Discord bot", excluded: true },
            { text: "GitHub issues", excluded: true },
            { text: "Image inputs", excluded: true },
          ]}
          href="/login"
        />
      )}
      <PricingBox
        title="Hobby"
        description="Explore the platform"
        price={`$${hobbyPlan.price}`}
        items={[
          { text: `${hobbyPlan.credits.scrapes} page credits/month` },
          { text: `${hobbyPlan.credits.messages} message credits/month` },
          { text: `${hobbyPlan.limits.scrapes} collections` },
          { text: `${hobbyPlan.limits.teamMembers} team members` },
          { text: "Base AI models" },
          { text: "Support tickets" },
          { text: "MCP server", excluded: true },
          { text: "Discord bot", excluded: true },
          { text: "GitHub issues", excluded: true },
          { text: "Image inputs", excluded: true },
        ]}
        href={
          "https://checkout.dodopayments.com/buy/pdt_IcrpqSx48qoCenz4lnLi1?quantity=1&redirect_url=https://crawlchat.app%2Fprofile%23billing"
        }
        payLabel="Purchase"
        onClick={onClick ? () => onClick?.(hobbyPlan.id) : undefined}
      />
      <PricingBox
        title="Starter"
        description="Start your journey with CrawlChat"
        price={`$${starterPlan.price}`}
        items={[
          { text: `${starterPlan.credits.scrapes} page credits/month` },
          { text: `${starterPlan.credits.messages} message credits/month` },
          { text: `${starterPlan.limits.scrapes} collections` },
          { text: `${starterPlan.limits.teamMembers} team members` },
          { text: "Smart AI models" },
          { text: "Support tickets" },
          { text: "MCP server" },
          { text: "Discord bot" },
          { text: "GitHub issues", excluded: true },
          { text: "Image inputs", excluded: true },
        ]}
        href={
          "https://checkout.dodopayments.com/buy/pdt_vgCVfRAaCT99LM1Dfk5qF?quantity=1&redirect_url=https://crawlchat.app%2Fprofile%23billing"
        }
        onClick={onClick ? () => onClick?.(starterPlan.id) : undefined}
      />
      <PricingBox
        title="Pro"
        description="For power users and teams"
        popular
        price={`$${proPlan.price}`}
        items={[
          { text: `${proPlan.credits.scrapes} page credits/month` },
          { text: `${proPlan.credits.messages} message credits/month` },
          { text: `${proPlan.limits.scrapes} collections` },
          { text: `${proPlan.limits.teamMembers} team members` },
          { text: "Reasoning AI models" },
          { text: "Support tickets" },
          { text: "MCP server" },
          { text: "Discord bot" },
          { text: "GitHub issues" },
          { text: "Image inputs" },
        ]}
        href={
          "https://checkout.dodopayments.com/buy/pdt_P68hLo9a0At8cgn4WbzBe?quantity=1&redirect_url=https://crawlchat.app%2Fprofile%23billing"
        }
        onClick={onClick ? () => onClick?.(proPlan.id) : undefined}
      />
    </>
  );
}

export function Pricing() {
  const { freePlan, starterPlan, proPlan, hobbyPlan } =
    useLoaderData<typeof loader>();

  return (
    <div className="mt-32" id="pricing">
      <Heading>
        <HeadingHighlight>Pricing</HeadingHighlight> for everyone
      </Heading>

      <div className="flex flex-col md:flex-row md:gap-6 gap-10 mt-20">
        <PricingBoxes
          // freePlan={freePlan}
          starterPlan={starterPlan}
          proPlan={proPlan}
          hobbyPlan={hobbyPlan}
        />
      </div>
    </div>
  );
}

export function CTA({ text }: { text?: string }) {
  return (
    <div className="mt-32" id="cta">
      <div className="w-full bg-gradient-to-b from-base-100 to-base-200 shadow-md rounded-2xl py-16 px-10 relative">
        <h2 className="font-radio-grotesk text-[42px] md:text-[42px] leading-[1.2] font-medium text-center max-w-[800px] mx-auto">
          {text || "Make your own AI chatbot from your documentation now!"}
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

function FooterLink({
  children,
  href,
  external,
}: PropsWithChildren<{ href: string; external?: boolean }>) {
  return (
    <a
      href={href}
      className="opacity-60 font-medium hover:underline"
      target={external ? "_blank" : undefined}
    >
      {children}
    </a>
  );
}

export function Footer() {
  return (
    <footer className="bg-base-100 mt-32 border-t border-base-300">
      <Container>
        <div className="py-8 flex flex-col md:flex-row gap-10">
          <div className="flex-[2] flex flex-col gap-4">
            <Logo />
            <p className="font-medium opacity-60">
              AI Chatbot for your documentation and support
            </p>
            <p className="opacity-50 text-xs font-medium">© 2025 CrawlChat</p>
            <div>
              <a
                href="https://www.tinystartups.com/launch/crawlchat/?utm_source=badge"
                target="_blank"
              >
                <img
                  src="https://cdn.prod.website-files.com/657b3d8ca1cab4015f06c850/680a4af610583c7e07a8f1a1_No2prgold-removebg-preview.png"
                  alt="CrawlChat was #2 Product of the Week on Tiny Startups"
                  style={{ width: "160px", height: "auto" }}
                />
              </a>
            </div>
          </div>
          <div className="flex-[2]">
            <ul className="flex flex-col gap-4">
              <li>
                <FooterLink href="/blog/actions-on-crawlchat">
                  Introducing Actions
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/blog/how-polotno-uses-crawlchat">
                  How Polotno uses CrawlChat
                </FooterLink>
              </li>
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
              <li>
                <FooterLink href="/blog/how-to-do-basic-rag">
                  How to do a basic RAG?
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
                <FooterLink href="/pricing">Pricing</FooterLink>
              </li>
              <li>
                <FooterLink href="/changelog">Changelog</FooterLink>
              </li>
              <li>
                <FooterLink href="https://docs.crawlchat.app" external>
                  Docs
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/blog">Blog</FooterLink>
              </li>
              <li>
                <FooterLink href="/discord-bot">Discord bot</FooterLink>
              </li>
              <li>
                <FooterLink href="https://crawlchat.affonso.io" external>
                  Affiliate program{" "}
                  <span className="whitespace-nowrap text-primary text-sm">
                    30% commission!
                  </span>
                </FooterLink>
              </li>
            </ul>
          </div>
          <div className="flex-[1]">
            <ul className="flex flex-col gap-4 mb-6">
              <li>
                <FooterLink href="/tool/draft">AI Draft tool</FooterLink>
              </li>
            </ul>

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
                  <TbMail />
                </a>
              </li>
              <li>
                <a href="https://x.com/pramodk73">
                  <TbBrandX />
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
    </footer>
  );
}

export function Nav({ changeLogDate }: { changeLogDate?: string }) {
  return (
    <nav className="flex items-center justify-between gap-2 lg:py-6">
      <Logo />

      <div className="flex items-center gap-8">
        <div className="items-center gap-8 hidden md:flex">
          <NavLink href="/#pricing">Pricing</NavLink>
          <NavLink href="https://docs.crawlchat.app">Docs</NavLink>
          <NavLink href="/changelog" tooltip={changeLogDate}>
            Changelog
          </NavLink>
          <NavLink href="/blog">Blog</NavLink>
          <NavLink href="/public-bots">Public bots</NavLink>
        </div>

        <Button href="/login">Login</Button>
      </div>
    </nav>
  );
}

export function ctaClassNames(primary: boolean) {
  return cn(
    "text-2xl border-2 border-primary px-8 py-4 rounded-xl font-medium",
    "flex items-center gap-2 transition-all hover:translate-y-[-2px]",
    "text-center justify-center",
    !primary && "text-primary hover:bg-primary-subtle",
    primary && "bg-primary text-primary-content"
  );
}

function Hero() {
  const { focusChangelog } = useLoaderData<typeof loader>();

  function handleAskCrawlChat() {
    track("hero-ask-ai", {
      page: "landing",
    });
    (window as any).crawlchatEmbed.show();
  }

  return (
    <div className="py-4">
      {focusChangelog && (
        <a
          className="flex justify-center mb-8 cursor-pointer hover:scale-[1.02] transition-all"
          href={`/changelog/${focusChangelog.slug}`}
        >
          <div className="bg-red-50 text-sm px-1.5 py-1 rounded-full flex items-center gap-2 pr-2 border border-red-300 text-red-700">
            <span className="px-2 bg-red-200 rounded-full font-medium border border-red-300">
              NEW
            </span>
            <span className="leading-none">{focusChangelog.title}</span>
            <span>
              <TbChevronRight />
            </span>
          </div>
        </a>
      )}

      <h1 className="font-radio-grotesk text-[42px] md:text-[64px] leading-[1.2] text-center max-w-[800px] mx-auto">
        <span className="text-primary">AI Chatbot</span> for your technical{" "}
        documentation
      </h1>

      <h2 className="text-center text-xl max-w-[700px] mx-auto mt-8">
        Power up your technical documentation with CrawlChat AI chatbot that you
        can connect on your{" "}
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
        <span className="hidden">.</span> so that your community, users &
        clients get the help they need.
      </h2>

      <div
        className={cn(
          "flex justify-center gap-4 my-8 flex-wrap",
          "flex-col sm:flex-row"
        )}
      >
        <button className={ctaClassNames(false)} onClick={handleAskCrawlChat}>
          <TbMessage />
          Ask AI
        </button>
        <a className={ctaClassNames(true)} href="/login">
          Try it out now
          <TbArrowRight />
        </a>
      </div>
    </div>
  );
}

export function LandingPage({ children }: PropsWithChildren) {
  return (
    <div data-theme="brand" className="bg-base-200 font-aeonik">
      <div
        className={cn(
          "hidden md:block aspect-[1440/960] w-full bg-[url('https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/clouds.png')]",
          // "dark:bg-[url('https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/clouds-dark.png')]",
          "bg-contain bg-no-repeat absolute top-0 left-0"
        )}
      >
        <div className="w-full h-full bg-gradient-to-b from-[rgba(246,246,245,0)] to-base-200"></div>
      </div>

      <div className="relative">{children}</div>
    </div>
  );
}

function FlowCard({
  title,
  description,
  img,
  cols,
  rows,
}: {
  title: string;
  description: string;
  img: string;
  cols: number;
  rows: number;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-base-100 border border-base-300 p-6 flex flex-col justify-between gap-4",
        cols === 1 && "md:col-span-1",
        cols === 2 && "md:col-span-2",
        cols === 3 && "md:col-span-3",
        rows === 1 && "md:row-span-1",
        rows === 2 && "md:row-span-2",
        rows === 3 && "md:row-span-3"
      )}
    >
      <div className="flex flex-col gap-2">
        <h3 className="text-3xl font-medium font-radio-grotesk">{title}</h3>
        <p className="text-lg opacity-60">{description}</p>
      </div>
      <div>
        <img
          src={img}
          alt={title}
          className="border border-base-300 rounded-lg"
        />
      </div>
    </div>
  );
}

export function Flow() {
  return (
    <div className="mt-32">
      <Heading>
        A workfow for <HeadingHighlight>AI powered</HeadingHighlight> docs
      </Heading>

      <HeadingDescription>
        CrawlChat is a simple yet powerful, AI tool for your technical
        documentation. You can configure it in few minutes and provides you
        useful analytics to improve your docs.
      </HeadingDescription>

      <div
        className={cn(
          `grid grid-cols-1 grid-rows-4 md:grid-cols-3 md:grid-rows-2 gap-6`
        )}
      >
        <FlowCard
          title="Knowledge base with your documentation"
          description="It all starts with turning your documentation into a knowledge base for the AI chatbot. You can just pass your online documentation URL or upload files as the knowledge base."
          img="/new-landing/flow-knowledge.png"
          cols={2}
          rows={1}
        />
        <FlowCard
          title="First level AI support"
          description="Let the AI chatbot answer the basic and repetitive questions so that your support time is reduced drastically."
          img="/new-landing/flow-chatbot.png"
          cols={1}
          rows={1}
        />
        <FlowCard
          title="Escalate to human support"
          description="CrawlChat has a simple yet powerful AI driven support ticket system. The chatbot will create a ticket if query is not resolved by AI."
          img="/new-landing/flow-support-ticket.png"
          cols={1}
          rows={1}
        />
        <FlowCard
          title="Analyse and improve"
          description="You get a detailed report of the chatbot's performance and the knowledge base against the queries your customers ask. You can find out the knowledge gaps on the basis of the scroes CrawlChat provides and improve your docs eventually."
          img="/new-landing/flow-analyse.png"
          cols={2}
          rows={1}
        />
      </div>
    </div>
  );
}

export function CustomTestimonial({
  text,
  author,
  authorImage,
  authorLink,
  icon,
  authorCompany,
}: {
  text: string | ReactNode;
  author: string;
  authorImage: string;
  authorLink: string;
  icon: ReactNode;
  authorCompany: string;
}) {
  return (
    <div className="border-r-0 md:border-r border-b md:border-b-0 border-base-300 p-6 last:border-r-0 last:border-b-0">
      <p className="text-xl font-radio-grotesk text-center italic">{text}</p>

      <div className="flex flex-col justify-center gap-2 mt-8">
        <div className="flex flex-col items-center">
          <img
            src={authorImage}
            alt={author}
            className="w-16 h-16 rounded-full border border-base-300"
          />
          <span className="font-medium">{author}</span>
          <span className="text-sm text-gray-500">{authorCompany}</span>
        </div>
        <div className="flex justify-center gap-2">
          <a href={authorLink}>{icon}</a>
        </div>
      </div>
    </div>
  );
}

function CTH({ children }: PropsWithChildren) {
  return (
    <span className="bg-primary text-primary-content px-3 mx-1 whitespace-nowrap rounded-box">
      {children}
    </span>
  );
}

function CTHS({ children }: PropsWithChildren) {
  return <span className="text-primary font-bold">{children}</span>;
}

export function JonnyTestimonial() {
  return (
    <CustomTestimonial
      text={
        <div>
          MCP, llms.txt and remotion.ai are now live! Thanks to @pramodk73 and{" "}
          <CTHS>CrawlChat</CTHS> for getting us up to speed with{" "}
          <CTH>AI integrations.</CTH>
        </div>
      }
      author="Jonny Burger"
      authorImage="https://pbs.twimg.com/profile_images/1701672174661046272/Ez-SKeJ1_400x400.jpg"
      authorLink="https://x.com/JNYBGR/status/1899786274635927674"
      icon={<TbBrandX />}
      authorCompany="Remotion"
    />
  );
}

export function EgelhausTestimonial() {
  return (
    <CustomTestimonial
      text={
        <div>
          We can definitely recommend using CrawlChat, it's{" "}
          <CTH>easy to set up</CTH>, really <CTH>affordable</CTH>, and has great
          support. Thank you <CTHS>@pramodk73</CTHS> for making this!
        </div>
      }
      author="Egelhaus"
      authorImage="https://avatars.githubusercontent.com/u/156946629?v=4"
      authorLink="https://github.com/egelhaus"
      icon={<TbBrandDiscord />}
      authorCompany="Postiz"
    />
  );
}

export function AntonTestimonial() {
  return (
    <CustomTestimonial
      text={
        <div>
          Integrated <CTHS>CrawlChat</CTHS> into the new Konva docs – hats off
          to @pramodk73 for making it insanely useful. It now powers{" "}
          <CTH>"Ask AI"</CTH> widget on site, <CTH>MCP server</CTH> for docs,{" "}
          <CTH>Discord bot</CTH> for community. Smarter docs. Better support.
        </div>
      }
      author="Anton Lavrenov"
      authorImage="https://pbs.twimg.com/profile_images/1561788279313383424/RcRFiKnE_400x400.png"
      authorLink="https://x.com/lavrton/status/1915467775734350149"
      icon={<TbBrandX />}
      authorCompany="Konvajs & Polotno"
    />
  );
}

export function MauritsTestimonial() {
  return (
    <CustomTestimonial
      text={
        <div>
          Can wholeheartedly <CTH>recommend this</CTH>. The number of support
          calls to 270 Degrees significantly <CTH>dropped</CTH> after we
          implemented <CTHS>CrawlChat</CTHS>.
        </div>
      }
      author="Maurits Koekoek"
      authorImage="https://media.licdn.com/dms/image/v2/D4E03AQG-zmBs0zHLvA/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1683012930288?e=1759968000&v=beta&t=4Q_NhlyWwWzn48ZqWllrHwonzwjOHr37rDgU4txRacA"
      authorLink="https://www.linkedin.com/feed/update/urn:li:activity:7353688013584977920?commentUrn=urn%3Ali%3Acomment%3A%28activity%3A7353688013584977920%2C7353699420036571137%29&dashCommentUrn=urn%3Ali%3Afsd_comment%3A%287353699420036571137%2Curn%3Ali%3Aactivity%3A7353688013584977920%29"
      icon={<TbBrandLinkedin />}
      authorCompany="270 Degrees"
    />
  );
}

export function CustomTestimonials() {
  return (
    <div className="mt-32 flex flex-col gap-10">
      <div className="grid grid-cols-1 md:grid-cols-3 border border-base-300 rounded-2xl bg-base-100">
        <JonnyTestimonial />
        <AntonTestimonial />
        <MauritsTestimonial />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3">
        <div />
        <div className="border border-base-300 rounded-2xl bg-base-100">
          <EgelhausTestimonial />
        </div>
        <div />
      </div>
    </div>
  );
}

function FAQ() {
  const questions = [
    {
      question: "How do I train the AI chatbot?",
      answer: (
        <p>
          There is technically no special process like training the AI chatbot.
          All you need to do is to add your existing help documentation about
          your product or service to the knowledge base. You can either pass the
          URL of your documentation or upload the files (multiple formats are
          supported) to the knowledge base. The chatbot will smartly understand
          the documentation and uses it to answer the questions.
        </p>
      ),
    },
    {
      question: "I already user other chatbot, why do I switch?",
      answer: (
        <div>
          CrawlChat shines in three areas:
          <ul className="list-disc list-inside pl-4 my-4">
            <li>
              CrawlChat uses latest LLM models and gives you the best answers
              for your customer queries.
            </li>
            <li>
              It comes with a support ticket system that is makes sure that the
              queries reaches your if the documentation is not enough.
            </li>
            <li>
              It provides all the necessary analytics required to monitor the
              performance of the chatbot and fine tune your documentation.
            </li>
          </ul>
        </div>
      ),
    },
    {
      question: "Do I need to bring my own OpenAI API key?",
      answer: (
        <p>
          No, CrawlChat uses the latest LLM models from OpenAI, Anthropic,
          Google, and Gemini. You can use the chatbot without any API key. You
          can choose the model that best suits your needs from the dashboard.
        </p>
      ),
    },
    {
      question: "Does it support other languages?",
      answer: (
        <p>
          Absolutely. That's is the advantage of using AI based chatbots. The
          LLMs/AI models are capable of answering your customer or client's
          queries in their own language out of the box. This includes all major
          32 languages like English, Spanish, French, German, Italian,
          Portuguese, Russian, Chinese, Japanese, Korean, etc.
        </p>
      ),
    },
    {
      question: "Can I try it out first?",
      answer: (
        <p>
          You can signup and try out the platform with free credits you get on
          signup. You can check the{" "}
          <a href="/#pricing" className="text-primary">
            pricing
          </a>{" "}
          section for more details about the credits.
        </p>
      ),
    },
    {
      question: "How can I integrate the chatbot to my website?",
      answer: (
        <p>
          It is a very simple process. You can navigate to the integration
          section and copy the code snippet. You can then paste the code snippet
          in your website. It also provides config for documentation solutions
          like Docusaurus, etc.
        </p>
      ),
    },
    {
      question: "How can add chatbot to Slack or Discord?",
      answer: (
        <p>
          Yes! CrawlChat provides a Discord bot and a Slack app that can be
          integrated with your Discord or Slack server. You can find the
          instructions to integrate the chatbot to your Discord or Slack server
          in the{" "}
          <a href="/discord-bot" className="text-primary">
            Discord bot
          </a>{" "}
          and Slack app pages. Once added to the channel or server, your
          community can tag <span className="text-primary">@CrawlChat</span> to
          ask questions to get the answers.
        </p>
      ),
    },
    {
      question: "What kind of analytics does it provide?",
      answer: (
        <div className="flex flex-col gap-4">
          <p>
            CrawlChat gives rating to each answer based on the relevance of the
            answer to the question. The more the score is, the better the answer
            and the documentation was for the given query. CrawlChat provides
            charts over time, distribution of the score and per messange &
            conversation scores as well. They help you to monitor the
            performance of the chatbot and the knowledge base.
          </p>
          <p>
            It also provides analytics on geo location of the users, browser,
            device, etc. so that you can understand the user behavior and
            improve your documentation.
          </p>
          <p>
            Apart from that, you can also what knowledge groups are being used
            the most to answer the questions.
          </p>
        </div>
      ),
    },
    {
      question: "How does Support Ticket System work?",
      answer: (
        <div className="flex flex-col gap-4">
          <p>
            CrawlChat's goal is to direct the queries to the humans if the
            documentation does not have answer for any query. So, when it has no
            answer, it prompts the user to give their email to create the
            support ticket. Once the support ticket is created, you can view
            them from the dashboard and work on the resolution. CrawlChat sends
            email notifications to the user whenever there is an update.
          </p>
          <p>You can close the ticket once the query is resolved.</p>
          <p>You can enable or disable this module as per your requirement</p>
        </div>
      ),
    },
    {
      question: "How can I customise the Ask AI widget?",
      answer: (
        <p>
          You can configure your own brand colors, text, logo for the Ask AI
          button that will be visible on your website. This can be controlled
          from the dashboard without updating the embedded snippet.
        </p>
      ),
    },
  ];

  const [active, setActive] = useState<number>();

  function handleClick(index: number) {
    track("faq-click", {
      question: questions[index].question,
    });
    if (active === index) {
      setActive(undefined);
    } else {
      setActive(index);
    }
  }

  function handleAsk() {
    track("faq-ask", {});
    (window as any).crawlchatEmbed.show();
  }

  return (
    <div className="flex flex-col mt-32">
      <Heading>Frequently Asked Questions</Heading>

      <div className="mt-20">
        {questions.map((question, index) => (
          <div key={index} className="border-b border-base-300 last:border-b-0">
            <div
              className={cn(
                "flex justify-between gap-4 text-2xl cursor-pointer py-8",
                "hover:text-primary",
                active === index && "text-primary"
              )}
              onClick={() => handleClick(index)}
            >
              <h3>{question.question}</h3>
              <span className="shrink-0">
                {active === index ? <TbChevronUp /> : <TbChevronDown />}
              </span>
            </div>
            <div
              className={cn("text-xl hidden pb-8", active === index && "block")}
            >
              {question.answer}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-16">
        <Button onClick={handleAsk}>
          Question not listed? Ask here
          <TbArrowRight />
        </Button>
      </div>
    </div>
  );
}

function Gallery() {
  const steps = [
    {
      title: "Dashboard",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/dashboard.png",
      icon: <TbDashboard />,
    },
    {
      title: "Demo",
      video:
        "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/landing-page-demo.mp4",
      poster:
        "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/landing-page-demo-poster.png",
      icon: <TbVideo />,
      new: true,
    },
    {
      title: "Add your docs",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/add-knowledge-group.png",
      icon: <TbBook />,
    },
    {
      title: "View knowledge",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/knowledge-groups.png",
      icon: <TbBook2 />,
    },
    {
      title: "Embed chatbot",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/customise-chatbot.png",
      icon: <TbCode />,
    },
    // {
    //   title: "Analytics",
    //   img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/analytics.png",
    //   icon: <TbChartBar />,
    // },
    {
      title: "Conversations",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/messages.png",
      icon: <TbMessage />,
    },
    {
      title: "Performance",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/performance.png",
      icon: <TbChartLine />,
    },
    {
      title: "Data gaps",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/data-gaps.png",
      icon: <TbChartBarOff />,
      new: true,
    },
  ];

  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleStepChange = (index: number) => {
    if (index === activeStep) return;
    track("gallery-click", {
      step: steps[index].title,
    });
    setActiveStep(index);

    if (!steps[index].img) return;

    setIsLoading(true);
    const img = new Image();
    img.onload = () => {
      setIsLoading(false);
    };
    img.onerror = () => {
      setIsLoading(false);
    };

    img.src = steps[index].img;
  };

  return (
    <div className="mb-16">
      <div
        className={cn(
          "flex justify-center items-center",
          "bg-base-100 aspect-video rounded-xl shadow-xl",
          "overflow-hidden mb-4 relative",
          "border border-base-300"
        )}
      >
        {steps[activeStep].img && isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-100 bg-opacity-50 z-10">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-lg font-medium opacity-70">Loading...</p>
            </div>
          </div>
        )}
        {steps[activeStep].img && (
          <img
            src={steps[activeStep].img}
            alt={steps[activeStep].title}
            className={cn(
              "w-full h-full object-cover",
              isLoading && "opacity-50"
            )}
          />
        )}

        {steps[activeStep].video && (
          <video
            autoPlay
            controls
            src={steps[activeStep].video}
            poster={steps[activeStep].poster}
            className={cn("w-full h-full object-cover")}
          />
        )}
      </div>

      <div
        className={cn(
          "border border-base-300 rounded-xl p-2",
          "flex gap-2 bg-base-100 justify-center lg:justify-between",
          "flex-wrap"
        )}
      >
        {steps.map((step, index) => (
          <button
            key={index}
            className={cn(
              "flex items-center p-1 rounded-md w-fit px-3 text-sm gap-1",
              "transition-all duration-200 cursor-pointer relative",
              activeStep === index && "bg-primary text-primary-content",
              activeStep !== index && "hover:bg-base-300",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => handleStepChange(index)}
            disabled={isLoading}
          >
            {step.icon}
            {step.title}
            {step.new && (
              <span
                className={cn(
                  "badge badge-error badge-xs",
                  "absolute top-0 right-0",
                  "translate-x-1/2 -translate-y-1/2"
                )}
              >
                New
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function SourcesChannels() {
  const sources = [
    {
      icon: <TbWorld />,
      title: "Websites",
      tooltip: "Scrape your documentation website",
    },
    {
      icon: <SiDocusaurus />,
      title: "Docusaurus",
      tooltip: "Add your Docusaurus website instantly",
    },
    {
      icon: <TbUpload />,
      title: "Files",
      tooltip: "Upload your documentation files",
    },
    {
      icon: <TbBrandGithub />,
      title: "Github issues",
      tooltip: "Fetch your GitHub issues instantly",
    },
    {
      icon: <TbBrandNotion />,
      title: "Notion",
      tooltip: "Import your Notion pages securely",
    },
    {
      icon: <FaConfluence />,
      title: "Confluence",
      tooltip: "Import your Confluence pages securely",
    },
  ];

  const channels = [
    {
      icon: <TbWorld />,
      title: "Embed",
      tooltip: "Embed the chatbot on your website",
    },
    {
      icon: <TbBrandSlack />,
      title: "Slack",
      tooltip: "Add the Slack bot and ask questions by tagging @crawlchat",
    },
    {
      icon: <TbBrandDiscord />,
      title: "Discord",
      tooltip: "Add the Discord bot and ask questions by tagging @crawlchat",
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="1em"
          height="1em"
          fill="currentColor"
          fillRule="evenodd"
          style={{ flex: "none", lineHeight: 1 }}
          aria-label="ModelContextProtocol"
        >
          <path d="M15.688 2.343a2.588 2.588 0 00-3.61 0l-9.626 9.44a.863.863 0 01-1.203 0 .823.823 0 010-1.18l9.626-9.44a4.313 4.313 0 016.016 0 4.116 4.116 0 011.204 3.54 4.3 4.3 0 013.609 1.18l.05.05a4.115 4.115 0 010 5.9l-8.706 8.537a.274.274 0 000 .393l1.788 1.754a.823.823 0 010 1.18.863.863 0 01-1.203 0l-1.788-1.753a1.92 1.92 0 010-2.754l8.706-8.538a2.47 2.47 0 000-3.54l-.05-.049a2.588 2.588 0 00-3.607-.003l-7.172 7.034-.002.002-.098.097a.863.863 0 01-1.204 0 .823.823 0 010-1.18l7.273-7.133a2.47 2.47 0 00-.003-3.537z" />
          <path d="M14.485 4.703a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a4.115 4.115 0 000 5.9 4.314 4.314 0 006.016 0l7.12-6.982a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a2.588 2.588 0 01-3.61 0 2.47 2.47 0 010-3.54l7.12-6.982z" />
        </svg>
      ),
      title: "MCP",
      tooltip: "Distribute your docs as an MCP server",
    },
  ];

  const tools = [
    {
      icon: <TbChartLine />,
      title: "Analytics",
      tooltip: "View messages, scores, efficiency and more",
    },
    {
      icon: <TbChartBarOff />,
      title: "Data Gaps",
      tooltip: "View data gaps and fix them",
    },
  ];

  return (
    <div className="mt-32 flex flex-col gap-4">
      <Heading>
        All useful <HeadingHighlight>sources</HeadingHighlight> and{" "}
        <HeadingHighlight>channels</HeadingHighlight>
      </Heading>

      <HeadingDescription>
        CrawlChat supports a wide range of sources for tech documentations and
        useful channels where you can integrate your chatbot.
      </HeadingDescription>

      <div className="flex flex-col items-center gap-2">
        <p className="text-base-content/20">Sources</p>
        <div className="flex gap-4 justify-center flex-wrap">
          {sources.map((source, index) => (
            <div
              key={index}
              className="tooltip tooltip-bottom before:max-w-36 md:before:max-w-64"
              data-tip={source.tooltip}
            >
              <div
                className={cn(
                  "flex flex-col items-center gap-2 bg-primary/5 p-4 rounded-box w-fit",
                  "border border-primary/20 w-36"
                )}
              >
                <div className="text-4xl text-primary">{source.icon}</div>
                <div className="font-radio-grotesk text-lg text-primary/80 text-center">
                  {source.title}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center text-2xl opacity-10">
        <TbArrowDown />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-base-content/20">CrawlChat</p>
        <div
          className={cn("bg-primary rounded-box text-primary-content", "flex")}
        >
          {tools.map((tool) => (
            <div
              key={tool.title}
              className="tooltip tooltip-bottom before:max-w-36 md:before:max-w-64"
              data-tip={tool.tooltip}
            >
              <div
                className={cn("flex flex-col items-center gap-2", "p-4 w-36")}
              >
                <div className="text-4xl">{tool.icon}</div>
                <div className="font-radio-grotesk text-lg text-center">
                  {tool.title}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center text-2xl opacity-10">
        <TbArrowDown />
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-4 justify-center flex-wrap">
          {channels.map((channel) => (
            <div
              key={channel.title}
              className="tooltip before:max-w-36 md:before:max-w-64"
              data-tip={channel.tooltip}
            >
              <div
                className={cn(
                  "flex flex-col items-center gap-2 bg-secondary/5 p-4 rounded-box w-fit",
                  "border border-secondary/20 w-36"
                )}
              >
                <div className="text-4xl text-secondary">{channel.icon}</div>
                <div className="font-radio-grotesk text-lg text-secondary/80 text-center">
                  {channel.title}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-base-content/20">Channels</p>
      </div>
    </div>
  );
}

export default function Landing({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Container>
        <Hero />
      </Container>

      <Container>
        <Gallery />
      </Container>

      <Container>
        <UsedBy />
      </Container>

      <Container>
        <CustomTestimonials />
      </Container>

      {/* <Container>
        <Stats
          messagesThisWeek={loaderData.messagesThisWeek}
          messagesDay={loaderData.messagesDay}
          messagesMonth={loaderData.messagesMonth}
        />
      </Container> */}

      <Container>
        <Works />
      </Container>

      <Container>
        <SourcesChannels />
      </Container>

      {/* <Container>
        <Flow />
      </Container> */}

      <Container>
        <ChannelWidget />
      </Container>

      <Container>
        <ChannelDiscord />
      </Container>

      <Container>
        <ChannelMCP />
      </Container>

      {/* <Container>
        <Tools />
      </Container> */}

      <Container>
        <Pricing />
      </Container>

      <Container>
        <FAQ />
      </Container>
    </>
  );
}

import type { Route } from "./+types/page";
import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  TbArrowRight,
  TbBook,
  TbBook2,
  TbBrandChrome,
  TbBrandDiscord,
  TbBrandGithub,
  TbBrandLinkedin,
  TbBrandNotion,
  TbBrandSlack,
  TbBrandX,
  TbCalendar,
  TbChartBar,
  TbChartBarOff,
  TbCheck,
  TbChevronDown,
  TbChevronRight,
  TbChevronUp,
  TbCircleCheckFilled,
  TbCircleFilled,
  TbCircleXFilled,
  TbCode,
  TbColorSwatch,
  TbCrown,
  TbDashboard,
  TbDatabase,
  TbFile,
  TbFolder,
  TbHelpCircleFilled,
  TbInfoCircleFilled,
  TbLock,
  TbMail,
  TbMenu2,
  TbMessage,
  TbMoodHappy,
  TbMusic,
  TbMusicX,
  TbPencil,
  TbPlayerPauseFilled,
  TbPlayerPlayFilled,
  TbPlug,
  TbPointer,
  TbRobotFace,
  TbScoreboard,
  TbSearch,
  TbShieldLock,
  TbThumbUp,
  TbTicket,
  TbUpload,
  TbUserHeart,
  TbUsers,
  TbVideo,
  TbWorld,
} from "react-icons/tb";
import { prisma } from "@packages/common/prisma";
import type { User } from "@packages/common/prisma";
import { track } from "~/components/track";
import { type Plan, allActivePlans } from "@packages/common/user-plan";
import { Link, useLoaderData } from "react-router";
import { cache as changelogCache } from "~/changelog/fetch";
import { makeMeta } from "~/meta";
import cn from "@meltdownjs/cn";
import { SiDocusaurus, SiLinear, SiN8N, SiOpenai } from "react-icons/si";
import { FaConfluence, FaMicrophone } from "react-icons/fa";
import { Logo } from "~/components/logo";
import { MCPIcon } from "~/components/mcp-icon";
import toast, { Toaster } from "react-hot-toast";
import { RiChatVoiceAiFill } from "react-icons/ri";

export function meta() {
  return makeMeta({
    title: "CrawlChat - Power up your tech documentation with AI",
    description:
      "Transform your technical documentation into an AI powered knowledge base. Get instant answers for your community via your website, Discord, or Slack.",
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
        llmMessage: {
          is: {
            role: "assistant",
          },
        },
      },
    });

    cache.messagesDay = await prisma.message.count({
      where: {
        createdAt: {
          gte: startOfDay,
        },
        llmMessage: {
          is: {
            role: "assistant",
          },
        },
      },
    });

    cache.messagesMonth = await prisma.message.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
        llmMessage: {
          is: {
            role: "assistant",
          },
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
    plans: allActivePlans,
    focusChangelog,
  };
}

export function Container({ children }: PropsWithChildren) {
  return (
    <div className="flex justify-center">
      <div className="max-w-[1200px] w-full p-8 md:p-10 md:py-4">
        {children}
      </div>
    </div>
  );
}

function NavLink({
  children,
  href,
  tooltip,
  className,
}: PropsWithChildren<{ href: string; tooltip?: string; className?: string }>) {
  return (
    <a
      href={href}
      className={cn(
        "hover:underline relative flex items-center gap-2",
        className
      )}
    >
      {children}
      {tooltip && (
        <div
          className={cn(
            "absolute top-0 right-0 text-[8px]",
            "bg-secondary text-secondary-content px-2 py-[2px] rounded-box",
            "translate-x-[20%] -translate-y-[80%]"
          )}
        >
          {tooltip}
        </div>
      )}
    </a>
  );
}

function StatsItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex gap-4 py-6 px-6 items-center border-b border-base-300 last:border-b-0">
      <div className="flex-1 flex">{label}</div>
      <div className="text-5xl md:text-6xl font-bold font-brand">{value}</div>
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
        <div className="text-md md:text-xl font-medium px-6 py-3 shadow-md rounded-box bg-base-100 w-fit flex items-center gap-4 -rotate-[4deg]">
          <div className="w-3 h-3 bg-green-500 rounded-box outline-2 outline-green-300" />
          Serving the community
        </div>
        <h3 className="text-4xl md:text-5xl font-brand font-bold leading-[1.2]">
          Answering <br />
          <span className="text-primary">questions</span> <br />
          continuously
        </h3>
      </div>

      <div className="flex-1 bg-base-100 rounded-box border border-base-300">
        <StatsItem label="Today" value={messagesDay} />
        <StatsItem label="In the last week" value={messagesThisWeek} />
        <StatsItem label="In the last month" value={messagesMonth} />
      </div>
    </div>
  );
}

function UsedByItem({
  children,
  ...props
}: HTMLAttributes<HTMLAnchorElement> & {
  href: string;
  target?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      {...props}
      className={cn(
        "flex items-center gap-2 shrink-0 grayscale",
        "hover:grayscale-0 transition-all",
        props.className
      )}
    >
      {children}
    </a>
  );
}

export function UsedBy() {
  return (
    <div className="flex flex-col gap-8">
      <h3 className="text-center text-xl font-medium opacity-50">
        Trusted by leading companies
      </h3>

      <div
        className={cn(
          "flex justify-center items-center gap-8 md:gap-16",
          "flex-wrap"
        )}
      >
        <UsedByItem href="https://remotion.dev" target="_blank">
          <img
            src="/used-by/remotion.png"
            alt="Remotion"
            className="max-h-[38px] shrink-0 grayscale hover:grayscale-0 transition-all"
          />
        </UsedByItem>

        <UsedByItem href="https://konvajs.org" target="_blank">
          <img
            src="/used-by/konvajs.png"
            alt="Konva"
            className="max-h-[38px]"
          />
          <div className="font-medium text-xl">Konvajs</div>
        </UsedByItem>

        <UsedByItem href="https://270degrees.nl" target="_blank">
          <img
            src="/used-by/270logo.svg"
            alt="270Degrees.nl"
            className="max-h-[38px]"
          />
          <div className="font-medium text-xl">270Degrees</div>
        </UsedByItem>

        <UsedByItem href="https://polotno.com" target="_blank">
          <img
            src="/used-by/polotno.png"
            alt="Polotno"
            className="max-h-[38px]"
          />
          <div className="font-medium text-xl">Polotno</div>
        </UsedByItem>

        <UsedByItem href="https://backpackforlaravel.com" target="_blank">
          <img
            src="/used-by/backpack-laravel.png"
            alt="Backpack for Laravel"
            className="max-h-[38px]"
          />
        </UsedByItem>

        <UsedByItem href="https://postiz.com" target="_blank">
          <div className="bg-gray-900 rounded-box p-3 px-4 pb-2 rounded-full shrink-0">
            <img
              src="/used-by/postiz.svg"
              alt="Postiz"
              className="max-h-[24px] grayscale"
            />
          </div>
        </UsedByItem>

        <UsedByItem href="https://nobl9.com" target="_blank">
          <img
            src="/used-by/nobl9.png"
            alt="Nobl9"
            className="max-h-[38px] grayscale"
          />
        </UsedByItem>
      </div>
    </div>
  );
}

export function Heading({ children }: PropsWithChildren) {
  return (
    <h3 className="text-center text-4xl md:text-5xl max-w-[300px] md:max-w-[640px] mx-auto font-brand leading-[1.3]">
      {children}
    </h3>
  );
}

export function HeadingHighlight({ children }: PropsWithChildren) {
  return (
    <span className="text-primary bg-primary-content px-4 rounded-box md:leading-[1.4]">
      {children}
    </span>
  );
}

export function HeadingDescription({ children }: PropsWithChildren) {
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
          "max-w-[300px] mx-auto rounded-box overflow-hidden",
          "border border-primary mb-4"
        )}
      >
        <img src={img} alt={title} className="w-full h-full" />
      </div>

      <h4 className="text-2xl font-brand">{title}</h4>
      <p className="text-center text-lg">{children}</p>
    </div>
  );
}

function stepHighlightClassNames() {
  return cn(
    "border px-2 py-0.5 inline-flex items-center gap-1 rounded-box leading-none mx-1"
  );
}

function Works() {
  return (
    <div className="mt-32" id="how-it-works">
      <Heading>
        Works in <HeadingHighlight>three</HeadingHighlight> simple steps
      </Heading>

      <HeadingDescription>
        CrawlChat features a streamlined workflow. Transform your documentation
        into an AI-ready knowledge base for your community in three simple
        steps.
      </HeadingDescription>

      <div className="flex flex-col md:flex-row gap-16 items-center md:items-start">
        <WorksStep
          img="/new-landing/knowledge-base.png"
          title="Make knowledge base"
        >
          Add your existing documents or web pages to create your knowledge
          base. Import documentation from multiple{" "}
          <span
            className={cn(
              stepHighlightClassNames(),
              "text-purple-500 border-purple-500"
            )}
          >
            <TbLock />
            private
          </span>{" "}
          and{" "}
          <span
            className={cn(
              stepHighlightClassNames(),
              "text-green-500 border-green-500"
            )}
          >
            <TbFile />
            public
          </span>{" "}
          sources in minutes.
        </WorksStep>
        <WorksStep img="/new-landing/integrate-chatbot.png" title="Integrate">
          Embed the Ask AI widget on your website, Discord server, or Slack
          workspace. Customize the bot's UI and{" "}
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
          Monitor all messages and conversations. Track performance{" "}
          <span
            className={cn(
              stepHighlightClassNames(),
              "text-green-500 border-green-500"
            )}
          >
            <TbScoreboard />
            scores
          </span>
          ,{" "}
          <span
            className={cn(
              stepHighlightClassNames(),
              "text-blue-500 border-blue-500"
            )}
          >
            <TbDatabase />
            data gaps
          </span>
          , and more.
        </WorksStep>
      </div>
    </div>
  );
}

export function Badge({ children }: PropsWithChildren) {
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
        "rounded-box p-4 border border-transparent hover:border-base-300 gap-2 flex flex-col",
        "cursor-pointer",
        active && "bg-base-300/50 hover:border-transparent"
      )}
      onClick={onClick}
    >
      <h3 className="text-2xl font-brand flex items-center gap-2">
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
  reverse,
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
  reverse?: boolean;
}) {
  const [activeTab, setActiveTab] = useState(features[0].key);

  function handleClick(tab: string) {
    track(trackName, {
      tab,
    });
    setActiveTab(tab);
  }

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row gap-10",
        reverse && "md:flex-row-reverse"
      )}
    >
      <div className="flex-1 flex flex-col gap-4">
        {features.map((feature) => (
          <ClickableFeature
            key={feature.key}
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
          "flex-1 bg-ash-strong rounded-box border",
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
      <Heading>
        Be on top with <HeadingHighlight>AI powered</HeadingHighlight> technical
        docs
      </Heading>

      <HeadingDescription>
        Stop making users search through hundreds of pages. Add CrawlChat to
        your documentation and let users find instant answers right where they
        need them.
      </HeadingDescription>

      <FeaturesWithImage
        trackName="channel-widget"
        features={[
          {
            title: "Embed on your website",
            description:
              "Embed the Ask AI widget on your website in minutes. Copy the embed code from CrawlChat and paste it into your site. Instantly deploy an AI assistant that handles most support queries.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/channels/4-min.png",
            key: "embed",
            icon: <TbPlug />,
          },
          {
            title: "Customise",
            description:
              "Customize the widget's appearance and response tone to match your brand. Add your colors, logo, labels, and customize AI behavior using custom prompts.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/channels/5-min.png",
            key: "customise",
            icon: <TbColorSwatch />,
          },
          {
            title: "Human support",
            description:
              "CrawlChat recognizes when it doesn't have an answer. Users can seamlessly escalate to human support via tickets. The widget automatically prompts users to create a support ticket with their email directly from the chat interface.",
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
      <Heading>
        Deliver your docs to your{" "}
        <HeadingHighlight>internal teams</HeadingHighlight>
      </Heading>

      <HeadingDescription>
        Tech companies often have extensive internal documentation across
        multiple teams. Delivering these docs efficiently is challenging. Import
        from Notion, Confluence, or upload files, then connect them to your
        Discord or Slack workspaces.
      </HeadingDescription>

      <FeaturesWithImage
        trackName="channel-discord"
        features={[
          {
            title: "Tag the bot",
            description:
              "Add the CrawlChat bot to your Discord server, and anyone can resolve queries by tagging @crawlchat. It uses the same knowledge base from your collection. All Discord messages are automatically tagged with their channel for admin tracking.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/channels/1-min.png",
            key: "tag",
            icon: <TbBrandDiscord />,
          },
          {
            title: "Sources",
            description:
              "The bot includes source citations with every answer, helping users dive deeper into your documentation. This works across the Web widget and Slack bot. Configure threaded replies to keep channels organized.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/channels/2-min.png",
            key: "sources",
            icon: <TbBook />,
          },
          {
            title: "Learn & Rate",
            description:
              "When moderators provide correct answers, train the bot directly from Discord. React with 🧩 to teach the bot correct responses. Users can rate answers with 👍 or 👎, and you can view all ratings in the dashboard to take action.",
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

function DashboardFeatures() {
  return (
    <div className="mt-32">
      <Heading>
        Get <HeadingHighlight>360° visibility</HeadingHighlight> into your docs
        and community
      </Heading>

      <HeadingDescription>
        While users turn to ChatGPT for answers, you're missing valuable
        insights from your docs and community. CrawlChat provides comprehensive
        insights on questions asked, categories, data gaps, scores, and more.
      </HeadingDescription>

      <FeaturesWithImage
        reverse
        trackName="analytics-dashboard"
        features={[
          {
            title: "Useful analytics",
            description:
              "CrawlChat delivers comprehensive insights about your documentation and user questions. Track daily messages, score distribution, data gaps, popular knowledge pages, categories, sentiment analysis, and more.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/channels/dashboard-analytics.png",
            key: "useful-analytics",
            icon: <TbChartBar />,
          },
          {
            title: "View questions",
            description:
              "Review user questions, identify gaps in your documentation, and improve accordingly. Group questions into categories and view channels for deeper insights.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/channels/dashboard-questions.png",
            key: "view-questions",
            icon: <TbColorSwatch />,
          },
          {
            title: "Teams",
            description:
              "Collaborate with multiple teams on your documentation. CrawlChat enables team collaboration to improve docs and support users effectively.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/channels/dashboard-team.png",
            key: "teams",
            icon: <TbUsers />,
          },
        ]}
      />
    </div>
  );
}

type PricingItem = {
  text: string | ReactNode;
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
  period = "month",
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
  period?: "month" | "year";
}) {
  return (
    <div
      className={cn(
        "flex-1 border border-base-300 rounded-box relative",
        popular && "border-primary"
      )}
    >
      {popular && (
        <div
          className={cn(
            "bg-primary-subtle border-2 border-primary absolute",
            "translate-y-[-40%] top-0 right-0 translate-x-[10%]",
            "text-lg text-primary px-3 py-2 font-medium flex items-center gap-2 rounded-box",
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
          popular && "border-primary"
        )}
      >
        <h4 className="text-3xl font-semibold font-brand">{title}</h4>
        <p className="opacity-50 font-medium">{description}</p>
      </div>
      <div className="p-6 gap-6 flex flex-col">
        <div className="flex gap-1 items-end">
          <p className="text-4xl font-semibold font-brand">{price}</p>
          <p className="opacity-50 font-medium mb-1">/{period}</p>
        </div>
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={index} className="flex gap-2 items-center">
              {item.excluded && (
                <span className="text-error">
                  <span className="w-0 h-0 block overflow-hidden">
                    Excluded
                  </span>
                  <TbCircleXFilled size={26} />
                </span>
              )}
              {!item.excluded && (
                <span className={cn("text-success")}>
                  <TbCircleCheckFilled size={26} />
                </span>
              )}
              <span className="text-lg">{item.text}</span>
            </li>
          ))}
        </ul>
        <div className="w-full">
          <a
            className={cn("w-full text-xl p-2 btn btn-primary btn-lg")}
            href={!onClick ? href : undefined}
            onClick={() => onClick?.()}
          >
            {payLabel ?? (free ? "Try it out" : "Purchase")}
            <TbArrowRight />
          </a>
        </div>
      </div>
    </div>
  );
}

function CreditsPopover() {
  return (
    <div className="dropdown dropdown-top dropdown-center inline-flex ml-2">
      <div
        tabIndex={0}
        role="button"
        className="btn btn-xs btn-square btn-soft opacity-50"
      >
        <TbInfoCircleFilled />
      </div>
      <div
        tabIndex={-1}
        className={cn(
          "dropdown-content menu bg-base-200 rounded-box z-1 w-52 p-2 shadow-sm",
          "mb-2"
        )}
      >
        <p>
          The net messages you get depends on the AI model you use.{" "}
          <a href="/ai-models" className="link link-primary link-hover">
            Click here
          </a>{" "}
          for more details.
        </p>
      </div>
    </div>
  );
}

function PlanBox({ plan }: { plan: Plan }) {
  return (
    <PricingBox
      period={plan.resetType === "monthly" ? "month" : "year"}
      title={plan.name}
      description={plan.description ?? "Get started with CrawlChat"}
      price={`$${plan.price}`}
      items={[
        { text: `${plan.limits.pages} pages` },
        {
          text: (
            <div>
              {plan.credits.messages} message credits/
              {plan.resetType === "monthly" ? "month" : "year"}
              <CreditsPopover />
            </div>
          ),
        },
        { text: `${plan.limits.scrapes} collections` },
        { text: `${plan.limits.teamMembers} team members` },
      ]}
      href={plan.checkoutLink}
      payLabel="Start free trial"
    />
  );
}

export function PricingBoxes({
  plans,
  yearly,
}: {
  plans: Plan[];
  yearly: boolean;
}) {
  const resetType = yearly ? "yearly" : "monthly";
  return plans
    .filter((plan) => plan.resetType === resetType)
    .map((plan) => <PlanBox key={plan.id} plan={plan} />);
}

export function PricingSwitch({
  yearly,
  setYearly,
}: {
  yearly: boolean;
  setYearly: (yearly: boolean) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleYearlyChange(yearly: boolean) {
    setYearly(yearly);
    track("pricing_" + (yearly ? "yearly" : "monthly"), {});
  }

  return (
    <div className="flex justify-center items-center gap-4">
      <span
        className="text-lg cursor-pointer"
        onClick={() => handleYearlyChange(false)}
      >
        Monthly
      </span>
      {mounted && (
        <input
          type="checkbox"
          checked={yearly}
          onChange={() => handleYearlyChange(!yearly)}
          className="toggle toggle-lg"
        />
      )}
      <span
        className="text-lg relative cursor-pointer"
        onClick={() => handleYearlyChange(true)}
      >
        <span
          className={cn(
            "absolute top-0 right-0 text-sm bg-primary/30 px-2 rounded-box",
            "whitespace-nowrap translate-x-3/4 -translate-y-3/4 rotate-10"
          )}
        >
          2 months free
        </span>
        Yearly
      </span>
    </div>
  );
}

export function Pricing({ noMarginTop }: { noMarginTop?: boolean }) {
  const { plans } = useLoaderData<typeof loader>();
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div className={cn("mt-32", noMarginTop && "mt-10")} id="pricing">
      <Heading>
        <HeadingHighlight>Pricing</HeadingHighlight> for everyone
      </Heading>

      <HeadingDescription>
        Choose the plan that best fits your needs. Start with a 7-day free trial
        and cancel anytime.
      </HeadingDescription>

      <PricingSwitch yearly={isYearly} setYearly={setIsYearly} />

      <div className="flex flex-col md:flex-row md:gap-6 gap-10 mt-20">
        <PricingBoxes plans={plans} yearly={isYearly} />
      </div>

      <div className="my-20 flex flex-col items-center">
        <Heading>Still not sure?</Heading>
        <HeadingDescription>
          Book a demo with the maker - Pramod and understand how CrawlChat can
          help you steamline your documentation and support processes
        </HeadingDescription>
        <Link
          to="https://cal.com/crawlchat/demo"
          target="_blank"
          className="btn btn-primary btn-outline btn-xl w-full md:w-auto"
        >
          Book a demo
          <TbCalendar />
        </Link>
      </div>
    </div>
  );
}

export function CTA({ text }: { text?: string }) {
  return (
    <div className="mt-32" id="cta">
      <div className="w-full py-16 px-10 relative border-t-4 border-dashed border-primary/20">
        <h2
          className={cn(
            "font-brand text-[36px] md:text-[42px] leading-[1.2]",
            "font-medium text-center max-w-[900px] mx-auto"
          )}
        >
          {text || "Power up your tech documentation with AI today!"}
        </h2>

        <div className="flex justify-center mt-8">
          <a href="/login" className="btn btn-primary btn-xl">
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
    <footer className="bg-base-200/50 border-t border-base-300">
      <Container>
        <div className="py-8 flex flex-col md:flex-row gap-8">
          <div className="flex-[2] flex flex-col gap-4">
            <Logo />
            <p className="font-medium text-base-content/50 font-brand italic">
              Power up your tech documentation with AI
            </p>
            <p className="opacity-50 text-xs font-medium">© 2026 CrawlChat</p>
            <p className="flex items-center gap-2">
              <span>Built with ❤️ by</span>{" "}
              <a
                href="https://x.com/pramodk73"
                target="_blank"
                className="rounded-box"
              >
                <img
                  src="/pramod.jpg"
                  alt="@pramodk73"
                  className="max-h-8 inline-block"
                />
              </a>
            </p>
          </div>
          <div className="flex-[2]">
            <div className="mb-8">
              <h3 className="text-sm opacity-50 mb-2">Trusted by</h3>
              <div className="flex items-center gap-4 flex-wrap">
                <img
                  src="/used-by/remotion.png"
                  alt="Remotion"
                  className="max-h-6 inline-block grayscale"
                />
                <img
                  src="/used-by/konvajs.png"
                  alt="Konva"
                  className="max-h-6 inline-block grayscale"
                />
                <img
                  src="/used-by/270logo.svg"
                  alt="270Degrees"
                  className="max-h-6 inline-block grayscale"
                />
                <img
                  src="/used-by/polotno.png"
                  alt="Polotno"
                  className="max-h-6 inline-block grayscale"
                />
                <img
                  src="/used-by/backpack-laravel.png"
                  alt="Backpack for Laravel"
                  className="max-h-6 inline-block grayscale"
                />
                <div className="bg-black px-2 rounded-full">
                  <img
                    src="/used-by/postiz.svg"
                    alt="Postiz"
                    className="max-h-4 inline-block grayscale"
                  />
                </div>
                <img
                  src="/used-by/nobl9.png"
                  alt="Nobl9"
                  className="max-h-6 inline-block grayscale"
                />
              </div>
            </div>

            <ul className="flex flex-col gap-4">
              <li>
                <FooterLink href="/blog/crawlchat-vs-kapa-ai">
                  CrawlChat vs Kapa.ai
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/blog/crawlchat-vs-docsbot-ai">
                  CrawlChat vs DocsBot.ai
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/blog/crawlchat-vs-chatbase">
                  CrawlChat vs Chatbase
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/blog/mava-vs-crawlchat">
                  CrawlChat vs Mava.app
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/blog/crawlchat-vs-sitegpt">
                  CrawlChat vs SiteGPT
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/blog/how-postiz-uses-crawlchat">
                  How Postiz Uses CrawlChat
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/blog/how-polotno-uses-crawlchat">
                  How Polotno uses CrawlChat
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/blog/how-to-embed-ai-chatbot">
                  How to add AI Chatbot for your docs
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
                <FooterLink href="/pricing">Pricing</FooterLink>
              </li>
              <li>
                <FooterLink href="/changelog">Changelog</FooterLink>
              </li>
              <li>
                <FooterLink href="/ai-models">AI Models</FooterLink>
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
                <FooterLink href="/open-source">Open source</FooterLink>
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
              <li>
                <FooterLink href="/data-privacy">Data privacy</FooterLink>
              </li>
            </ul>

            <ul className="flex gap-4 mt-4">
              <li>
                <a href="https://github.com/crawlchat/crawlchat">
                  <TbBrandGithub />
                </a>
              </li>
              <li>
                <a href="https://x.com/crawlchat">
                  <TbBrandX />
                </a>
              </li>
              <li>
                <a href="https://discord.gg/zW3YmCRJkC">
                  <TbBrandDiscord />
                </a>
              </li>
              <li>
                <a href="mailto:support@crawlchat.app">
                  <TbMail />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </Container>
    </footer>
  );
}

function CaseStudyDropdown() {
  return (
    <div className="dropdown">
      <div
        tabIndex={0}
        role="button"
        className="flex items-center gap-2 cursor-pointer"
      >
        Case studies
        <TbChevronDown />
      </div>
      <ul
        tabIndex={0}
        className={cn(
          "dropdown-content menu bg-base-100 rounded-box z-1 w-72 p-2",
          "shadow-lg mt-4"
        )}
      >
        <li>
          <Link
            className="flex gap-2 items-center group"
            to="/case-study/remotion"
          >
            <img
              src="https://raw.githubusercontent.com/remotion-dev/brand/main/logo.svg"
              alt="Remotion"
              className="max-h-5 inline-block grayscale group-hover:grayscale-0 transition-all"
            />
            Remotion
          </Link>
        </li>

        <li>
          <Link
            className="flex gap-2 items-center group"
            to="/case-study/polotno"
          >
            <img
              src="/used-by/polotno.png"
              alt="Polotno"
              className="max-h-5 inline-block grayscale group-hover:grayscale-0 transition-all"
            />
            Polotno
          </Link>
        </li>

        <li>
          <Link
            className="flex gap-2 items-center group"
            to="/case-study/postiz"
          >
            <img
              src="https://cms.postiz.com/wp-content/uploads/2024/06/newfav.png"
              alt="Postiz"
              className="max-h-5 inline-block grayscale group-hover:grayscale-0 transition-all"
            />
            Postiz
          </Link>
        </li>
      </ul>
    </div>
  );
}

function BurgerMenu({
  user,
  githubStars,
}: {
  user?: User | null;
  githubStars?: number;
}) {
  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-square">
        <TbMenu2 />
      </div>
      <ul
        tabIndex={-1}
        className={cn(
          "dropdown-content menu bg-base-200 rounded-box z-1 w-42 p-2 shadow-sm",
          "mt-2"
        )}
      >
        {githubStars && (
          <li>
            <a href="https://github.com/crawlchat/crawlchat" target="_blank">
              <TbBrandGithub />
              {githubStars} stars
            </a>
          </li>
        )}
        {!user && (
          <li>
            <Link to="/pricing">Start free trial</Link>
          </li>
        )}
        {!user && (
          <li>
            <a href="/login">Login</a>
          </li>
        )}
        {user && (
          <li>
            <a href="/app">Dashboard</a>
          </li>
        )}
        <li>
          <a href="/pricing">Pricing</a>
        </li>
        <li>
          <a href="/changelog">Changelog</a>
        </li>
      </ul>
    </div>
  );
}

function UseCasesDropdown() {
  return (
    <div className="dropdown">
      <div
        tabIndex={0}
        role="button"
        className="flex items-center gap-2 cursor-pointer"
      >
        Use cases
        <TbChevronDown />
      </div>
      <ul
        tabIndex={0}
        className={cn(
          "dropdown-content menu bg-base-100 rounded-box z-1 w-72 p-2",
          "shadow-lg mt-4"
        )}
      >
        <li>
          <Link
            className="flex flex-col gap-0 items-start"
            to="/use-case/community-support"
          >
            <span className="flex items-center gap-2">
              <TbUsers />
              Community support
            </span>
            <span className="text-sm text-base-content/50">
              Let your community get the answers from your docs instantly
            </span>
          </Link>
        </li>

        <li>
          <Link
            className="flex flex-col gap-0 items-start"
            to="/use-case/empower-gtm-teams"
          >
            <span className="flex items-center gap-2">
              <TbRobotFace />
              Internal assistant
            </span>
            <span className="text-sm text-base-content/50">
              Let your internal teams have a unified knowledge base. Best for
              GTM teams
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}

export function Nav({
  user,
  githubStars,
}: {
  user?: User | null;
  githubStars?: number;
}) {
  return (
    <div
      className={cn(
        "backdrop-blur-2xl",
        "sticky top-0 z-20",
        "border-b border-accent/20"
      )}
    >
      <nav
        className={cn(
          "flex items-center justify-between gap-2",
          "max-w-[1200px] mx-auto",
          "px-8 md:px-10 py-4"
        )}
      >
        <Link to="/">
          <Logo />
        </Link>

        <div className="flex items-center gap-6">
          {githubStars && (
            <NavLink
              href="https://github.com/crawlchat/crawlchat"
              className={cn("text-primary shrink-0 hidden md:flex")}
            >
              <TbBrandGithub />
              <span>{githubStars} stars</span>
            </NavLink>
          )}

          <div className="hidden md:block">
            <CaseStudyDropdown />
          </div>

          <div className="hidden lg:block">
            <UseCasesDropdown />
          </div>

          <NavLink href="/pricing" className="hidden md:flex">
            Pricing
          </NavLink>
          <NavLink href="/changelog" className="hidden lg:flex">
            Changelog
          </NavLink>

          {!user && (
            <Link to="/login" className="hidden md:flex">
              Login
            </Link>
          )}
          {!user && (
            <div className="hidden md:block">
              <Link to="/pricing" className="btn btn-primary">
                Start free trial
              </Link>
            </div>
          )}
          {user && (
            <a href="/app" className="btn btn-primary hidden md:flex">
              Dashboard
              <TbArrowRight />
            </a>
          )}

          <div className="block md:hidden">
            <BurgerMenu user={user} githubStars={githubStars} />
          </div>
        </div>
      </nav>
    </div>
  );
}

function Hero() {
  const { focusChangelog } = useLoaderData<typeof loader>();

  const features = [
    {
      text: "Works on your website, Discord, and Slack, or MCP",
      icon: <TbCode />,
    },
    {
      text: "Strong citations for your users and analytics to improve your docs",
      icon: <TbChartBar />,
    },
    {
      text: "Automatically creates support tickets when AI can't help",
      icon: <TbRobotFace />,
    },
  ];

  const channels = [
    {
      icon: <TbWorld />,
      tooltip: "Embed on your website",
    },
    {
      icon: <TbBrandDiscord />,
      tooltip: "Add as Discord bot on your server",
    },
    {
      icon: <TbBrandSlack />,
      tooltip: "Add as Slack bot on your workspace",
    },
    {
      icon: <TbBrandGithub />,
      tooltip:
        "Add as GitHub bot to answer questions in discussions and issues",
    },
    {
      icon: <MCPIcon />,
      tooltip: "Distribute your docs as an MCP server",
    },
    {
      icon: <TbCode />,
      tooltip: "Integrate with your workflows using API",
    },
  ];

  return (
    <div
      className={cn(
        "flex gap-10 md:gap-14 mb-10 flex-col md:flex-row py-2 md:mt-8"
      )}
    >
      <div className={cn("flex flex-col flex-[1.4] z-10")}>
        {focusChangelog && (
          <a
            className="mb-4 cursor-pointer hover:scale-[1.02] transition-all w-fit"
            href={`/changelog/${focusChangelog.slug}`}
          >
            <div className="bg-red-50 text-sm px-1.5 py-1 rounded-box flex items-center gap-2 pr-2 border border-red-300 text-red-700">
              <span className="px-2 bg-red-200 rounded-box font-medium border border-red-300">
                NEW
              </span>
              <span className="leading-none">{focusChangelog.title}</span>
              <span>
                <TbChevronRight />
              </span>
            </div>
          </a>
        )}

        <h1 className="font-brand text-[36px] md:text-[62px] leading-[1.2]">
          Power up your documentation with{" "}
          <span className="text-accent whitespace-nowrap">AI</span>
        </h1>

        <p className="md:text-xl mt-6 font-brand italic text-base-content/50">
          Add an AI chatbot to your documentation website. Users can ask
          questions and get instant answers from your docs with citations.
        </p>

        <ul className="mt-6 flex flex-col gap-2">
          {features.map((feature, index) => (
            <li key={index} className="flex gap-2 items-start">
              <div className="text-primary rounded-box p-1 mt-0.5">
                <TbCheck size={20} />
              </div>
              <span className="md:text-lg">{feature.text}</span>
            </li>
          ))}
        </ul>

        <div
          className={cn(
            "flex gap-4 mt-8 mb-4 flex-wrap",
            "flex-col sm:flex-row"
          )}
        >
          <Link to="/pricing" className="btn btn-primary btn-xl">
            Start free trial
            <TbArrowRight />
          </Link>
          <div
            className="tooltip"
            data-tip="Connect with the maker - Pramod and understand how CrawlChat can help your business"
          >
            <Link
              to="https://cal.com/crawlchat/demo"
              target="_blank"
              className="btn btn-primary btn-outline btn-xl w-full md:w-auto"
            >
              Book a demo
              <TbCalendar />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 flex-col mt-2">
        <div className="relative animate-breath-y">
          <div className="border-2 border-accent rounded-box overflow-hidden shadow">
            <iframe
              src="/w/crawlchat?theme=light"
              className="w-full h-[560px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage({ children }: PropsWithChildren) {
  const handleCopyCoupon = () => {
    navigator.clipboard.writeText("BLACKFRIDAY2025");
    toast.success("Coupon code copied to clipboard");
  };

  return (
    <div data-theme="brand" className="font-aeonik">
      <div className="relative">{children}</div>
      <Toaster position="bottom-center" />
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
  small,
}: {
  text: string | ReactNode;
  author: string;
  authorImage: string;
  authorLink: string;
  icon: ReactNode;
  authorCompany: string;
  small?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-r-0 md:border-r border-b",
        "md:border-b-0 border-base-300 p-6 last:border-r-0",
        "last:border-b-0 group"
      )}
    >
      <p
        className={cn(
          "font-brand text-center text-base-content/60",
          "group-hover:text-base-content",
          !small && "text-xl"
        )}
      >
        {text}
      </p>

      <div className="flex flex-col justify-center gap-2 mt-8">
        <div className="flex flex-col items-center">
          <img
            src={authorImage}
            alt={author}
            className="w-16 h-16 rounded-box border border-base-300"
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
    <span className="bg-accent/10 text-accent px-3 mx-1 whitespace-nowrap rounded-box">
      {children}
    </span>
  );
}

function CTHS({ children }: PropsWithChildren) {
  return <span className="text-primary font-bold">{children}</span>;
}

export function JonnyTestimonial({ small }: { small?: boolean }) {
  return (
    <CustomTestimonial
      text={
        <span>
          MCP, llms.txt and remotion.ai are now live! Thanks to @pramodk73 and{" "}
          <CTHS>CrawlChat</CTHS> for getting us up to speed with{" "}
          <CTH>AI integrations.</CTH>
        </span>
      }
      author="Jonny Burger"
      authorImage="/testi-profile/jonny.jpg"
      authorLink="https://x.com/JNYBGR/status/1899786274635927674"
      icon={<TbBrandX />}
      authorCompany="Remotion"
      small={small}
    />
  );
}

export function EgelhausTestimonial({ small }: { small?: boolean }) {
  return (
    <CustomTestimonial
      text={
        <span>
          We can definitely recommend using CrawlChat, it's{" "}
          <CTH>easy to set up</CTH>, really <CTH>affordable</CTH>, and has great
          support. Thank you <CTHS>@pramodk73</CTHS> for making this!
        </span>
      }
      author="Egelhaus"
      authorImage="/testi-profile/egelhaus.png"
      authorLink="https://github.com/egelhaus"
      icon={<TbBrandDiscord />}
      authorCompany="Postiz"
      small={small}
    />
  );
}

export function AntonTestimonial({ small }: { small?: boolean }) {
  return (
    <CustomTestimonial
      text={
        <span>
          Integrated <CTHS>CrawlChat</CTHS> into the new Konva docs – hats off
          to @pramodk73 for making it insanely useful. It now powers{" "}
          <CTH>"Ask AI"</CTH> widget on site, <CTH>MCP server</CTH> for docs,{" "}
          <CTH>Discord bot</CTH> for community. Smarter docs. Better support.
        </span>
      }
      author="Anton Lavrenov"
      authorImage="/testi-profile/anton.png"
      authorLink="https://x.com/lavrton/status/1915467775734350149"
      icon={<TbBrandX />}
      authorCompany="Konvajs & Polotno"
      small={small}
    />
  );
}

export function MauritsTestimonial({ small }: { small?: boolean }) {
  return (
    <CustomTestimonial
      text={
        <span>
          Can wholeheartedly <CTH>recommend this</CTH>. The number of support
          calls to 270 Degrees significantly <CTH>dropped</CTH> after we
          implemented <CTHS>CrawlChat</CTHS>.
        </span>
      }
      author="Maurits Koekoek"
      authorImage="/testi-profile/maurits.jpeg"
      authorLink="https://www.linkedin.com/feed/update/urn:li:activity:7353688013584977920?commentUrn=urn%3Ali%3Acomment%3A%28activity%3A7353688013584977920%2C7353699420036571137%29&dashCommentUrn=urn%3Ali%3Afsd_comment%3A%287353699420036571137%2Curn%3Ali%3Aactivity%3A7353688013584977920%29"
      icon={<TbBrandLinkedin />}
      authorCompany="270 Degrees"
      small={small}
    />
  );
}

export function CustomTestimonials() {
  return (
    <div className="mt-32 flex flex-col gap-10">
      <div className="grid grid-cols-1 md:grid-cols-4 border border-base-300 bg-base-100/50">
        <JonnyTestimonial />
        <AntonTestimonial />
        <MauritsTestimonial />
        <EgelhausTestimonial />
      </div>
    </div>
  );
}

export function FAQ() {
  const questions = [
    {
      question: "How do I train with my documentation?",
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
      question: "I already use other chatbots, why do I switch?",
      answer: (
        <div>
          CrawlChat shines in three areas:
          <ul className="list-disc list-inside pl-4 my-4">
            <li>
              CrawlChat uses latest LLM models and gives you the best answers
              for your customer queries.
            </li>
            <li>
              It comes with a support ticket system that ensures queries reach
              you when documentation isn't sufficient.
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
          Absolutely. That's the advantage of using AI based chatbots. The
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
      question: "How can I integrate the Ask AI widget to my website?",
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
      question: "How can I integrate it with Slack or Discord?",
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
            charts over time, distribution of the score and per message &
            conversation scores as well. They help you to monitor the
            performance of the chatbot and the knowledge base.
          </p>
          <p>
            It also provides analytics on geo location of the users, browser,
            device, etc. so that you can understand the user behavior and
            improve your documentation.
          </p>
          <p>
            Apart from that, you can also see what knowledge groups are being
            used the most to answer the questions.
          </p>
        </div>
      ),
    },
    {
      question: "What happens if the message credits run out?",
      answer: (
        <p>
          The message credits are reset every month whenever the subscription is
          renewed. Whereas the pages is the number of unique pages (maxed to a
          set of characters) you have at any given point of time. Choose the
          plan that best suits your needs. You can topup your message credits by
          sending an email to support.
        </p>
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
                "hover:text-primary items-center",
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
        <button onClick={handleAsk} className="btn btn-primary btn-soft btn-lg">
          Question not listed? Ask here
          <TbArrowRight />
        </button>
      </div>
    </div>
  );
}

function GalleryVideo({
  id,
  video,
  poster,
  autoPlay,
}: {
  id: string;
  video: string;
  poster: string;
  autoPlay: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    function handlePlay() {
      setPlaying(true);
      track(`gallery-video-${id}`, {
        video: video,
      });
    }
    function handlePause() {
      setPlaying(false);
    }
    videoRef.current?.addEventListener("play", handlePlay);
    videoRef.current?.addEventListener("pause", handlePause);
    return () => {
      videoRef.current?.removeEventListener("play", handlePlay);
      videoRef.current?.removeEventListener("pause", handlePause);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  function handlePlay() {
    videoRef.current?.play();
  }

  function handleToggleMute() {
    setMuted(!muted);
  }

  function handlePause() {
    videoRef.current?.pause();
  }

  return (
    <div className="relative">
      {!playing && (
        <div
          className={cn(
            "absolute w-full h-full bg-black/50",
            "flex justify-center items-center flex-col gap-2 md:gap-4"
          )}
        >
          <button
            className={cn(
              "p-4 md:p-10 bg-primary text-primary-content rounded-box",
              "cursor-pointer hover:scale-105 transition-all duration-200 z-10",
              "text-4xl md:text-8xl"
            )}
            onClick={handlePlay}
          >
            <TbPlayerPlayFilled />
          </button>
          <div className="text-base-100">Plays with sound</div>
        </div>
      )}

      {playing && (
        <div className="absolute p-4 flex items-center gap-2 bottom-0">
          <button
            className={cn(
              "p-2 bg-base-100 text-primary rounded-box",
              "cursor-pointer hover:scale-105 transition-all duration-200 z-10",
              "shadow"
            )}
            onClick={handlePause}
          >
            <TbPlayerPauseFilled />
          </button>
          <button
            className={cn(
              "p-2 bg-base-100 text-primary rounded-box",
              "cursor-pointer hover:scale-105 transition-all duration-200 z-10",
              "shadow"
            )}
            onClick={handleToggleMute}
          >
            {!muted ? <TbMusicX /> : <TbMusic />}
          </button>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay={autoPlay ?? true}
        src={video}
        poster={poster}
        className={cn("w-full h-full object-cover")}
      />
    </div>
  );
}

function Gallery() {
  const steps = [
    {
      title: "Dashboard",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/dashboard-v2.png",
      icon: <TbDashboard />,
    },
    {
      title: "Intro",
      icon: <TbVideo />,
      video:
        "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/intro.mp4",
      poster:
        "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/intro-poster.png",
      new: true,
      autoPlay: false,
    },
    // {
    //   title: "Demo",
    //   video:
    //     "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/landing-page-demo.mp4",
    //   poster:
    //     "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/landing-page-demo-poster.png",
    //   icon: <TbVideo />,
    // },
    {
      title: "Add your docs",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/add-knowledge-group-v2.png",
      icon: <TbBook />,
    },
    {
      title: "View knowledge",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/knowledge-groups.png",
      icon: <TbBook2 />,
    },
    {
      title: "Embed AI",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/customise-chatbot.png",
      icon: <TbCode />,
    },
    {
      title: "Categories",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/categories.png",
      icon: <TbFolder />,
      new: true,
    },
    {
      title: "Conversations",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/messages.png",
      icon: <TbMessage />,
    },
    {
      title: "Data gaps",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/data-gaps.png",
      icon: <TbChartBarOff />,
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
          "border border-base-300 rounded-box p-2",
          "flex gap-2 bg-base-100 justify-center lg:justify-between",
          "flex-wrap"
        )}
      >
        {steps.map((step, index) => (
          <button
            key={index}
            className={cn(
              "flex items-center p-1 rounded-box w-fit px-3 text-sm gap-1",
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
                  "absolute top-0 right-0 z-10",
                  "translate-x-1/2 -translate-y-3/4"
                )}
              >
                New
              </span>
            )}
          </button>
        ))}
      </div>

      <div
        className={cn(
          "flex justify-center items-center",
          "bg-base-100 aspect-video rounded-box shadow-xl",
          "overflow-hidden mt-4 relative",
          "border border-base-300"
        )}
      >
        {steps[activeStep].img && isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-100 bg-opacity-50 z-10">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-box h-12 w-12 border-b-2 border-primary"></div>
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
          <GalleryVideo
            key={steps[activeStep].title.replace(" ", "-").toLowerCase()}
            id={steps[activeStep].title.replace(" ", "-").toLowerCase()}
            autoPlay={steps[activeStep].autoPlay ?? true}
            video={steps[activeStep].video}
            poster={steps[activeStep].poster}
          />
        )}
      </div>
    </div>
  );
}

export function SourceCard({
  icon,
  title,
  tooltip,
  isNew,
}: {
  icon: ReactNode;
  title: string;
  tooltip: string;
  isNew?: boolean;
}) {
  return (
    <div
      className="tooltip before:max-w-36 md:before:max-w-64 relative"
      data-tip={tooltip}
    >
      {isNew && <NewBadge />}
      <div
        className={cn(
          "flex flex-col items-center gap-2 bg-primary/5 p-4 rounded-box w-fit",
          "border border-primary/20 w-36"
        )}
      >
        <div className="text-4xl text-primary">{icon}</div>
        <div className="font-brand text-lg text-primary/80 text-center">
          {title}
        </div>
      </div>
    </div>
  );
}

function NewBadge() {
  return (
    <span
      className={cn(
        "absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
        "badge badge-error badge-sm"
      )}
    >
      New
    </span>
  );
}

export function ChannelCard({
  icon,
  title,
  tooltip,
  isNew,
}: {
  icon: ReactNode;
  title: string;
  tooltip: string;
  isNew?: boolean;
}) {
  return (
    <div
      key={title}
      className="tooltip tooltip-bottom before:max-w-36 md:before:max-w-64 relative"
      data-tip={tooltip}
    >
      {isNew && <NewBadge />}
      <div
        className={cn(
          "flex flex-col items-center gap-2 bg-secondary/5 p-4 rounded-box w-fit",
          "border border-secondary/20 w-36"
        )}
      >
        <div className="text-4xl text-secondary">{icon}</div>
        <div className="font-brand text-lg text-secondary/80 text-center">
          {title}
        </div>
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
      title: "Issues",
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
    {
      icon: <SiLinear />,
      title: "Linear",
      tooltip: "Import your Linear issues and projects securely",
    },
    {
      icon: <TbVideo />,
      title: "YouTube",
      tooltip: "Extract transcript from YouTube videos",
    },
    {
      icon: <TbCode />,
      title: "API",
      tooltip: "Add pages to the knowledge base using API",
      isNew: true,
    },
    {
      icon: <TbBrandGithub />,
      title: "Discussions",
      tooltip: "Fetch your GitHub discussions instantly",
      isNew: true,
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
      icon: <TbBrandGithub />,
      title: "GitHub",
      tooltip:
        "Add the GitHub bot and ask questions by tagging @crawlchat in discussions and issues",
      isNew: true,
    },
    {
      icon: <MCPIcon />,
      title: "MCP",
      tooltip: "Distribute your docs as an MCP server",
    },
    {
      icon: <TbCode />,
      title: "API",
      tooltip: "Use the API to integrate with your own applications",
    },
    {
      icon: <SiN8N />,
      title: "n8n",
      tooltip: "Integrate with n8n by using CrawlChat node into your workflows",
      isNew: true,
    },
    {
      icon: <FaMicrophone />,
      title: "Voice",
      tooltip: "Ask questions by voice using a voice agent",
      isNew: true,
    },
  ];

  return (
    <div className="mt-32 flex flex-col gap-4 max-w-[100vw] overflow-hidden">
      <Heading>
        All useful <HeadingHighlight>sources</HeadingHighlight> and{" "}
        <HeadingHighlight>channels</HeadingHighlight>
      </Heading>

      <HeadingDescription>
        CrawlChat supports a wide range of documentation sources and delivery
        channels, enabling AI powered documentation across your entire
        ecosystem.
      </HeadingDescription>

      <p className="text-base-content/20 text-center">Sources</p>

      <div className="flex flex-col bg-base-100 py-8 gap-8">
        <div className="inline-flex gap-4 flex-nowrap infinite-scroll-container">
          {Array.from(Array(4)).map((_, i) => (
            <div key={i} className="flex gap-4 animate-infinite-scroll">
              {sources.map((source, index) => (
                <div
                  key={`${i}-${source.title}-${index}`}
                  className="flex-shrink-0"
                >
                  <SourceCard
                    icon={source.icon}
                    title={source.title}
                    tooltip={source.tooltip}
                    isNew={source.isNew}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="inline-flex gap-4 flex-nowrap infinite-scroll-container">
          {Array.from(Array(4)).map((_, i) => (
            <div key={i} className="flex gap-4 animate-infinite-scroll-reverse">
              {channels.map((channel, index) => (
                <ChannelCard
                  key={`${i}-${channel.title}-${index}`}
                  icon={channel.icon}
                  title={channel.title}
                  tooltip={channel.tooltip}
                  isNew={channel.isNew}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="text-base-content/20 text-center">Channels</p>
    </div>
  );
}

function SecondaryCTA({
  title,
  description,
  icon,
  href,
  ctaLabel,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  ctaLabel: string;
}) {
  return (
    <div
      className={cn(
        "border border-primary/20 rounded-box overflow-hidden flex-1"
      )}
    >
      <div
        className={cn(
          "p-4 border-b border-primary/20",
          "bg-gradient-to-br from-primary/5 to-primary/10"
        )}
      >
        <h3 className="text-2xl font-medium font-brand">{title}</h3>
        <p className="text-base-content/50">{description}</p>
      </div>
      <div
        className={cn(
          "p-4 flex justify-between items-center w-full",
          "bg-gradient-to-r from-primary/20 to-primary/5",
          "overflow-hidden"
        )}
      >
        <div
          className={cn(
            "text-4xl text-primary scale-400 -rotate-20",
            "overflow-hidden opacity-10"
          )}
        >
          {icon}
        </div>
        <Link to={href} className="btn btn-primary">
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}

function SecondaryCTAs() {
  return (
    <div className="flex flex-col items-center md:flex-row gap-4 justify-center">
      <SecondaryCTA
        title="Join on Discord"
        description="Interested? Join the Discord server to get updates and find out more about the product from the community."
        icon={<TbBrandDiscord />}
        href="https://discord.gg/zW3YmCRJkC"
        ctaLabel="Join now"
      />

      <SecondaryCTA
        title="Chrome extension"
        description="Generate text content from your documentation directly in any text field across the web. Write support emails or product descriptions instantly."
        icon={<TbBrandChrome />}
        href="https://chromewebstore.google.com/detail/crawlchat/icimflpdiioobolkjdbldmmomflainie"
        ctaLabel="Install now"
      />
    </div>
  );
}

function PricingFeature({
  icon,
  title,
  tooltip,
}: {
  icon: ReactNode;
  title: string;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center gap-2 group">
      <div className="text-primary text-lg">{icon}</div>
      <div className="font-brand text-primary text-lg">{title}</div>

      {tooltip && (
        <div
          className={cn(
            "tooltip text-base-content/30 group-hover:opacity-100 opacity-0",
            "hidden md:block"
          )}
          data-tip={tooltip}
        >
          <TbInfoCircleFilled />
        </div>
      )}
    </div>
  );
}

export function PricingFeatures() {
  const features = [
    {
      icon: <TbCode />,
      title: "API",
    },
    {
      icon: <TbBrandDiscord />,
      title: "Discord bot",
    },
    {
      icon: <TbBrandSlack />,
      title: "Slack app",
    },
    {
      icon: <MCPIcon />,
      title: "MCP server",
    },
    {
      icon: <TbBrandGithub />,
      title: "GitHub issues",
      tooltip: "Import your GitHub issues into your knowledge base",
    },
    {
      icon: <TbBrandNotion />,
      title: "Notion",
      tooltip: "Import your Notion pages into your knowledge base",
    },
    {
      icon: <FaConfluence />,
      title: "Confluence",
      tooltip: "Import your Confluence pages into your knowledge base",
    },
    {
      icon: <SiLinear />,
      title: "Linear",
      tooltip:
        "Import your Linear issues and projects into your knowledge base",
    },
    {
      icon: <SiN8N />,
      title: "n8n",
      tooltip: "Integrate with n8n by using CrawlChat node into your workflows",
    },
    {
      icon: <TbChartBar />,
      title: "Analytics",
    },
    {
      icon: <TbFolder />,
      title: "Categories",
      tooltip: "Group your questions into categories for better insights",
    },
    {
      icon: <TbChartBarOff />,
      title: "Data gaps",
    },
    {
      icon: <TbUsers />,
      title: "Teams",
    },
    {
      icon: <TbTicket />,
      title: "Support tickets",
      tooltip: "Create support tickets for your users when AI can't help",
    },
    {
      icon: <TbShieldLock />,
      title: "Private",
      tooltip: "Keep your knowledge base private and secure",
    },
    {
      icon: <TbMoodHappy />,
      title: "Sentiment analysis",
    },
    {
      icon: <TbPointer />,
      title: "Actions",
      tooltip: "Add custom actions as APIs for the chatbot to perform",
    },
    {
      icon: <TbPencil />,
      title: "Compose",
      tooltip:
        "Use your knowledge base to create content for different purposes",
    },
    {
      icon: <TbBrandChrome />,
      title: "Chrome extension",
      tooltip:
        "Use the Chrome extension to quickly generate text content from your documentation",
    },
    {
      icon: <TbMail />,
      title: "Email reports",
      tooltip:
        "Get weekly reports on your email about the questions asked and analytics",
    },
    {
      icon: <TbHelpCircleFilled />,
      title: "Follow up questions",
    },
  ];

  return (
    <div className="border border-base-300 rounded-box p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-medium font-brand">Features</h2>
        <p className="text-base-content/50">
          Following features are available in all plans.
        </p>
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {features.map((feature) => (
          <PricingFeature
            key={feature.title}
            icon={feature.icon}
            title={feature.title}
            tooltip={feature.tooltip}
          />
        ))}
      </ul>
    </div>
  );
}

function BentoCard({
  icon,
  title,
  description,
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-box border border-base-300 bg-base-100 p-6",
        "flex flex-col gap-3",
        className
      )}
    >
      <div className="text-3xl text-accent">{icon}</div>
      <h4 className="text-xl font-brand">{title}</h4>
      <p className="text-base-content/70 leading-relaxed">{description}</p>
    </div>
  );
}

function Why() {
  const benefits = [
    {
      icon: <TbSearch />,
      title: "vs. RAG",
      description:
        "The RAG workflow just stops at finding the relevant documents. CrawlChat goes further by reranking them, supporting multiple sources, multiple platforms to deploy the chat assistant, categorizing the questions, finding data gaps, giving you the ability to add custom actions, and so on.",
    },
    {
      icon: <SiOpenai />,
      title: "vs. LLMs",
      description:
        "Offloading support doesn't help. CrawlChat gives complete visibility into your community queries and useful analytics.",
    },
    {
      icon: <TbUserHeart />,
      title: "vs. Human Support",
      description:
        "The queries you get are repeated and answered 80% of the time in your docs. CrawlChat respects humans and saves their time!",
    },
    {
      icon: <TbMessage />,
      title: "vs. Other AI Chatbots",
      description:
        "CrawlChat is tailored for technical documentation and developer workflows. Other platforms don't provide tools such as Discord bot, MCP server, integrated Support Tickets, Data gaps, etc. If you have software and help docs, CrawlChat is the best choice.",
    },
  ];

  return (
    <div className="mt-32">
      <Heading>
        Why use <HeadingHighlight>CrawlChat</HeadingHighlight>?
      </Heading>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
        <BentoCard
          icon={benefits[0].icon}
          title={benefits[0].title}
          description={benefits[0].description}
          className="md:col-span-2 lg:col-span-2"
        />
        <BentoCard
          icon={benefits[1].icon}
          title={benefits[1].title}
          description={benefits[1].description}
        />
        <BentoCard
          icon={benefits[2].icon}
          title={benefits[2].title}
          description={benefits[2].description}
        />
        <BentoCard
          icon={benefits[3].icon}
          title={benefits[3].title}
          description={benefits[3].description}
          className="md:col-span-2"
        />
      </div>
    </div>
  );
}

export function OpenSource() {
  return (
    <div
      className={cn(
        "mt-32 open-source-bg p-6 md:p-12 rounded-box",
        "border border-primary/20 -rotate-1 shadow-xl",
        "flex flex-col items-center gap-10"
      )}
    >
      <h3 className={cn("text-4xl md:text-5xl font-brand", "text-center")}>
        <span
          className={cn(
            "inline-flex items-center gap-2 text-primary flex-nowrap",
            "translate-y-[5px] md:translate-y-2"
          )}
        >
          <RiChatVoiceAiFill /> CrawlChat
        </span>{" "}
        <span>is</span> <span className="text-accent">open source</span>{" "}
        <span>now!</span>
      </h3>

      <p className="text-2xl text-center max-w-3xl">
        Want to <span className="text-accent">self-host</span> it for yourself?
        Now you can run the entire platform on your servers and customise it to
        your needs. Or{" "}
        <a
          className="text-accent hover:underline"
          href="https://github.com/crawlchat/crawlchat/pulls"
          target="_blank"
        >
          submit a PR
        </a>{" "}
        to contribute to the project!
      </p>

      <div className="flex flex-col md:flex-row justify-center gap-4">
        <a
          href="https://github.com/crawlchat/crawlchat"
          target="_blank"
          className="btn btn-primary btn-xl"
        >
          View on GitHub
          <TbBrandGithub />
        </a>

        <a
          href="https://docs.crawlchat.app/self-hosting/run-via-docker"
          target="_blank"
          className="btn btn-outline btn-xl btn-primary"
        >
          Self host it
          <TbArrowRight />
        </a>
      </div>
    </div>
  );
}

export default function Landing({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <div
        className={cn(
          "bg-gradient-to-b from-accent/20 to-base-100",
          "absolute top-0 left-0 w-full h-[600px]"
        )}
      />
      <div
        className={cn(
          "absolute top-0 left-0 w-full h-[600px]",
          "hero-bg-pattern",
          "[mask-image:linear-gradient(to_bottom,black,transparent)]"
        )}
      />

      <Container>
        <Hero />
      </Container>

      <Container>
        <Gallery />
      </Container>

      <Container>
        <UsedBy />
      </Container>

      <CustomTestimonials />

      <Container>
        <Works />
      </Container>

      <Container>
        <ChannelWidget />
      </Container>

      <Container>
        <DashboardFeatures />
      </Container>

      <Container>
        <ChannelDiscord />
      </Container>

      {/* <Container>
        <Stats
          messagesThisWeek={loaderData.messagesThisWeek}
          messagesDay={loaderData.messagesDay}
          messagesMonth={loaderData.messagesMonth}
        />
      </Container> */}

      <Container>
        <Why />
      </Container>

      <Container>
        <OpenSource />
      </Container>

      <Container>
        <Pricing />
      </Container>

      <Container>
        <PricingFeatures />
      </Container>

      {/* <Container>
        <SecondaryCTAs />
      </Container> */}

      <SourcesChannels />

      <Container>
        <FAQ />
      </Container>
    </>
  );
}

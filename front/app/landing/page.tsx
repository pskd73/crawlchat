import cn from "@meltdownjs/cn";
import { type Plan, allActivePlans, topupPlans } from "@packages/common/plans";
import type { User } from "@packages/common/prisma";
import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Toaster } from "react-hot-toast";
import { FaConfluence, FaMicrophone } from "react-icons/fa";
import { RiChatVoiceAiFill } from "react-icons/ri";
import { SiDocusaurus, SiLinear, SiN8N } from "react-icons/si";
import {
  TbArrowRight,
  TbBook,
  TbBook2,
  TbBrain,
  TbBrandDiscord,
  TbBrandGithub,
  TbBrandLinkedin,
  TbBrandNotion,
  TbBrandSlack,
  TbBrandX,
  TbBrandYoutube,
  TbChartBar,
  TbChartBarOff,
  TbChevronDown,
  TbChevronRight,
  TbCircleCheck,
  TbCircleCheckFilled,
  TbCircleFilled,
  TbCircleXFilled,
  TbClockHour4,
  TbCode,
  TbColorSwatch,
  TbCrown,
  TbDashboard,
  TbDatabase,
  TbFile,
  TbFolder,
  TbGlobe,
  TbGraph,
  TbHelpCircle,
  TbInfoCircleFilled,
  TbLanguage,
  TbLock,
  TbMail,
  TbMenu2,
  TbMessage,
  TbMoneybag,
  TbMusic,
  TbMusicX,
  TbPlayerPauseFilled,
  TbPlayerPlayFilled,
  TbPlus,
  TbRobot,
  TbRobotFace,
  TbScoreboard,
  TbUpload,
  TbUsers,
  TbVideo,
  TbWorld,
} from "react-icons/tb";
import { Link, useLoaderData } from "react-router";
import { cache as changelogCache } from "~/changelog/fetch";
import { Logo } from "~/components/logo";
import { MCPIcon } from "~/components/mcp-icon";
import { numberToKMB } from "~/components/number-util";
import { track } from "~/components/track";
import { makeMeta } from "~/meta";
import { planProductIdMap, productIdTopupMap } from "~/payment/gateway-dodo";
import { Faq } from "./faq";
import { landingFaqItems } from "./landing-faq-data";
import { PricingFeatureComparison } from "./pricing-features";

export { Faq as FAQ } from "./faq";
export type { FaqItem } from "./faq";
export { landingFaqItems } from "./landing-faq-data";

export function meta() {
  return makeMeta({
    title: "CrawlChat - Documentation AI Assistant for SaaS Teams",
    description:
      "AI for documentation that gives instant, source-linked answers on web, Discord, and Slack. Reduce hallucination in AI answers with grounded docs search.",
  });
}

export async function loader() {
  const focusChangelog = changelogCache
    .get()
    .filter((post) => post.tags?.includes("focus"))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const plans = allActivePlans.map((plan) => ({
    ...plan,
    url: `/checkout/${planProductIdMap[plan.id]}`,
  }));

  return {
    plans,
    focusChangelog,
    topupPlans: topupPlans.map((plan) => ({
      ...plan,
      purchaseUrl: `/checkout/${productIdTopupMap[Number(plan.id)]}`,
    })),
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
        "text-base-content/80 hover:text-base-content",
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
  const items = (
    <>
      <UsedByItem href="https://remotion.dev" target="_blank">
        <img
          src="/used-by/remotion.png"
          alt="Remotion"
          className="max-h-[34px] shrink-0 grayscale hover:grayscale-0 transition-all"
        />
      </UsedByItem>

      <UsedByItem href="https://konvajs.org" target="_blank">
        <img src="/used-by/konvajs.png" alt="Konva" className="max-h-[38px]" />
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

      <UsedByItem href="https://localstack.cloud" target="_blank">
        <img
          src="/used-by/localstack.png"
          alt="LocalStack"
          className="max-h-[38px]"
        />
        <div className="font-medium text-xl">LocalStack</div>
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
          className="max-h-[34px] grayscale"
        />
      </UsedByItem>

      <UsedByItem href="https://openc3.com" target="_blank">
        <div className="bg-gray-900 rounded-box p-2 rounded-full shrink-0">
          <img
            src="/used-by/openc3.png"
            alt="OpenC3"
            className="max-h-[32px] grayscale"
          />
        </div>
      </UsedByItem>
    </>
  );

  return (
    <div className="flex flex-col gap-8">
      <h3 className="text-center text-xl opacity-50">
        Trusted by leading companies
      </h3>

      <div className="relative overflow-hidden used-by-scroll-container">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-linear-to-r from-base-100 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-linear-to-l from-base-100 to-transparent" />

        <div className="inline-flex flex-nowrap items-center">
          {Array.from(Array(4)).map((_, i) => (
            <div
              key={i}
              className="flex gap-12 pr-12 shrink-0 items-center animate-used-by-scroll"
            >
              {items}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Heading({ children }: PropsWithChildren) {
  return (
    <h3
      className={cn(
        "text-center text-4xl md:text-5xl",
        "max-w-[300px] md:max-w-[640px] mx-auto",
        "font-brand leading-[1.3]"
      )}
    >
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
    <p
      className={cn(
        "text-center text-xl",
        "max-w-[760px] mx-auto py-8 opacity-60"
      )}
    >
      {children}
    </p>
  );
}

function WorksStep({
  title,
  children,
  cards,
}: PropsWithChildren<{
  title: string;
  cards: Array<[ReactNode, string]>;
}>) {
  return (
    <div
      className={cn("flex flex-col gap-4 flex-1", "items-center max-w-[400px]")}
    >
      <div
        className={cn(
          "grid grid-cols-3",
          "mb-4",
          "rounded-box border border-base-300",
          "gap-px bg-base-300"
        )}
      >
        {cards.map(([icon, title], index) => (
          <div
            key={index}
            className={cn(
              "p-4 flex flex-col items-center justify-center",
              "gap-1 bg-base-100 group",
              "first:rounded-tl-box nth-[3]:rounded-tr-box",
              "last:rounded-br-box nth-[4]:rounded-bl-box"
            )}
          >
            <div className="tooltip" data-tip={title}>
              <div
                className={cn(
                  "text-2xl opacity-70 group-hover:opacity-100",
                  "transition-all duration-500",
                  "group-hover:text-primary group-hover:scale-140 group-hover:rotate-360"
                )}
              >
                {icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <h4 className="text-2xl font-brand">{title}</h4>
      <p className="text-center text-lg text-base-content/80">{children}</p>
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

      <div
        className={cn(
          "flex flex-col md:flex-row",
          "gap-16 items-center md:items-start",
          "mt-8"
        )}
      >
        <WorksStep
          title="Build AI documentation knowledge base"
          cards={[
            [<TbGlobe />, "Discord"],
            [<TbBrandNotion />, "Notion"],
            [<TbBrandGithub />, "GitHub Issues & Discussions"],
            [<TbBrandYoutube />, "Youtube Videos"],
            [<SiLinear />, "Linear Issues & Projects"],
            [<TbPlus />, "+5 more"],
          ]}
        >
          Add your existing documents or web pages to create your AI
          documentation knowledge base. Import documentation from multiple{" "}
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

        <WorksStep
          title="Integrate"
          cards={[
            [<TbGlobe />, "Web embed"],
            [<TbBrandDiscord />, "Discord"],
            [<TbBrandSlack />, "Slack"],
            [<MCPIcon />, "MCP"],
            [<TbCode />, "API"],
            [<TbPlus />, "+5 more"],
          ]}
        >
          Embed your documentation assistant on your website, Discord server, or
          Slack workspace. Customize the bot's UI and{" "}
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
          title="Observe"
          cards={[
            [<TbChartBar />, "Daily logs"],
            [<TbFolder />, "Categories"],
            [<TbUsers />, "User analytics"],
            [<TbMail />, "Email reports"],
            [<TbLanguage />, "Geo & Language analytics"],
            [<TbPlus />, "Many more"],
          ]}
        >
          Monitor all messages and conversations. Track performance, detect
          hallucination in AI answers, and improve answer quality with{" "}
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
        "rounded-box p-4 border border-transparent",
        "hover:border-base-300 gap-2 flex flex-col",
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
      <p className="opacity-50">{description}</p>
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
          "flex-1 bg-base-200 rounded-box border",
          "border-base-300 aspect-square overflow-hidden",
          "w-full aspect-square h-fit",
          "flex items-center justify-center"
        )}
      >
        <img
          src={features.find((feature) => feature.key === activeTab)?.img}
          className={cn(
            "max-w-[90%] max-h-[90%]",
            "border border-base-300 rounded-box"
          )}
        />
      </div>
    </div>
  );
}

function CreateKnowledgeBase() {
  return (
    <div className="mt-32">
      <Heading>
        Build an <HeadingHighlight>AI-powered knowledge base</HeadingHighlight>
      </Heading>

      <HeadingDescription>
        CrawlChat turns live docs, PDFs, and wikis into an AI-powered knowledge
        base in minutes. Unify tech and developer content, including API
        references, in one place so your AI can answer from a single searchable
        portal, public or internal.
      </HeadingDescription>

      <FeaturesWithImage
        trackName="create-knowledge-base"
        features={[
          {
            title: "Import",
            description:
              "Paste a URL and CrawlChat crawls technical documentation and developer documentation pages into your knowledge base, tuned for documentation search and answers from your answering agent.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/new-features/kb-create.png",
            key: "add-documentation",
            icon: <TbBook2 />,
          },
          {
            title: "Multiple sources",
            description:
              "Combine documentation portals, FAQs, specifications, help articles, video tutorials, and PDFs in one AI-powered knowledge base—without leaving CrawlChat.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/new-features/kb-list.png",
            key: "multiple-sources",
            icon: <TbBrain />,
          },
          {
            title: "Auto sync",
            description:
              "Keep sources fresh with auto sync for websites, Notion, Confluence, Linear issues, and more so technical documentation and internal knowledge base content stay current.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/new-features/kb-sync.png",
            key: "auto-sync",
            icon: <TbClockHour4 />,
          },
        ]}
      />
    </div>
  );
}

function Channels() {
  return (
    <div className="mt-32">
      <Heading>
        Deploy <HeadingHighlight>documentation AI</HeadingHighlight> on every
        channel
      </Heading>

      <HeadingDescription>
        Run the same answering agent everywhere customers look for answers, an
        AI chatbot for your website, Slack, Discord, GitHub, MCP, and API, one
        documentation AI stack for self-service support.
      </HeadingDescription>

      <FeaturesWithImage
        trackName="channels"
        features={[
          {
            title: "Omni-channel",
            description:
              "Ship documentation AI on your site, Discord, Slack workspace, GitHub repositories, MCP server, API, and more from a single CrawlChat workspace.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/new-features/channels-omni.png",
            key: "omni-channel-agent",
            icon: <TbRobot />,
          },
          {
            title: "Customise behaviour",
            description:
              "Tune prompts so your answering agent matches tone, policies, and escalation rules. Match brand colours on the web widget for a documentation portal experience.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/new-features/channels-prompt.png",
            key: "customise-behaviour",
            icon: <TbColorSwatch />,
          },
          {
            title: "Multiple AI models",
            description:
              "Choose leading models by provider and set defaults globally or per channel so your documentation AI stays fast, accurate, and cost-aware.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/new-features/channels-ai-models.png",
            key: "multiple-ai-models",
            icon: <TbBrain />,
          },
        ]}
        reverse
      />
    </div>
  );
}

function Analyse() {
  return (
    <div className="mt-32">
      <Heading>
        <HeadingHighlight>Analyse</HeadingHighlight> documentation search &
        improve
      </Heading>

      <HeadingDescription>
        Answering questions is only half the job. CrawlChat analytics shows how
        teams use documentation search and where technical documentation falls
        short so that product, docs, and customer support automation efforts
        stay aligned.
      </HeadingDescription>

      <FeaturesWithImage
        trackName="analyse"
        features={[
          {
            title: "Questions summary",
            description:
              "See volume trends, categories, sentiment, sources cited, and audience signals in one dashboard built for documentation portal and internal knowledge base owners.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/new-features/analyse-summary.png",
            key: "analyse-summary",
            icon: <TbChartBar />,
          },
          {
            title: "View questions",
            description:
              "Inspect every query with similarity to your knowledge base, categories, sentiment, sources used, and geo context—ideal for prioritising updates to developer documentation and API documentation.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/new-features/analyse-questions.png",
            key: "view-questions",
            icon: <TbHelpCircle />,
          },
          {
            title: "Data gaps",
            description:
              "CrawlChat surfaces questions closely related to your content but missing clear coverage—data gaps you can turn into roadmap items for technical documentation and self-service support.",
            img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/new-features/analyse-data-gaps.png",
            key: "view-users",
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
            className={cn(
              "w-full text-xl p-2 btn btn-primary btn-lg",
              !popular && "btn-soft"
            )}
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

function InfoPopover({ children }: PropsWithChildren) {
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
          "dropdown-content menu bg-base-200 rounded-box z-1 w-52 p-4 py-3 shadow-sm",
          "mb-2"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function PlanBox({ plan, url }: { plan: Plan; url: string }) {
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
              <InfoPopover>
                <p>
                  The net messages you get depends on the AI model you use.{" "}
                  <a href="/ai-models" className="link link-primary link-hover">
                    Click here
                  </a>{" "}
                  for more details.
                </p>
              </InfoPopover>
            </div>
          ),
        },
        { text: `${plan.limits.scrapes} collections` },
        { text: `${plan.limits.teamMembers} team members` },
      ]}
      href={url}
      payLabel="Start free trial"
      popular={plan.popular}
    />
  );
}

export function PricingBoxes({
  plans,
  yearly,
}: {
  plans: Array<Plan & { url: string }>;
  yearly: boolean;
}) {
  const resetType = yearly ? "yearly" : "monthly";
  return plans
    .filter((plan) => plan.resetType === resetType)
    .map((plan) => <PlanBox key={plan.id} plan={plan} url={plan.url} />);
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

export function PricingTopups() {
  const { topupPlans } = useLoaderData<typeof loader>();
  return (
    <div>
      <div className="flex flex-col md:flex-row md:gap-6 gap-10 mt-10 w-full">
        {topupPlans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "flex flex-col gap-4 flex-1",
              "border border-base-300 rounded-box p-4"
            )}
          >
            <div className="text-2xl font-brand">
              <span className="font-semibold">{numberToKMB(plan.credits)}</span>{" "}
              Credits
            </div>
            <p className="opacity-50">{plan.description}</p>
            <div>
              <a href={plan.purchaseUrl} className="btn btn-soft">
                Topup for ${plan.price}
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="opacity-50 text-center my-10">
        You need to be on a paid plan first to topup credits. Credits don't roll
        over to next month.
      </div>
    </div>
  );
}

export function Pricing({ noMarginTop }: { noMarginTop?: boolean }) {
  const { plans, topupPlans } = useLoaderData<typeof loader>();
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
          <div className="flex-2 flex flex-col gap-4">
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
                className="rounded-box overflow-hidden"
              >
                <img
                  src="/pramod.jpg"
                  alt="@pramodk73"
                  className="max-h-8 inline-block"
                />
              </a>
            </p>
            <div className="mt-4">
              <ul className="flex flex-col gap-4">
                <li>
                  <FooterLink href="/use-case/community-support">
                    Community support
                  </FooterLink>
                </li>
                <li>
                  <FooterLink href="/use-case/empower-gtm-teams">
                    Internal knowledge base
                  </FooterLink>
                </li>
                <li>
                  <FooterLink href="/use-case/customer-support-automation">
                    Customer support automation
                  </FooterLink>
                </li>
                <li>
                  <FooterLink href="/use-case/discord-community-automation">
                    Discord community automation
                  </FooterLink>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex-2">
            <ul className="flex flex-col gap-4">
              <li>
                <FooterLink href="/compare/crawlchat-vs-kapaai">
                  CrawlChat vs Kapa.ai
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/compare/crawlchat-vs-docsbot">
                  CrawlChat vs DocsBot.ai
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/compare/crawlchat-vs-chatbase">
                  CrawlChat vs Chatbase
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/compare/crawlchat-vs-mava">
                  CrawlChat vs Mava.app
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/compare/crawlchat-vs-sitegpt">
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
          <div className="flex-1">
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
                <FooterLink href="/case-study">Case studies</FooterLink>
              </li>
              <li>
                <FooterLink href="/discord-bot">Discord bot</FooterLink>
              </li>
              <li>
                <FooterLink href="/open-source">Open source</FooterLink>
              </li>
              <li>
                <FooterLink href="/ask-github-repo">Ask GitHub Repo</FooterLink>
              </li>
              <li>
                <FooterLink href="/website-to-markdown">
                  Website to markdown
                </FooterLink>
              </li>
            </ul>
          </div>
          <div className="flex-1">
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
                <a href="https://youtube.com/@crawlchat">
                  <TbBrandYoutube />
                </a>
              </li>
              <li>
                <a href="mailto:support@crawlchat.app">
                  <TbMail />
                </a>
              </li>
            </ul>

            <a
              href="https://status.crawlchat.app"
              target="_blank"
              rel="noreferrer"
              className="block mt-4"
            >
              <img
                src="https://status.crawlchat.app/api/badge/7/uptime?style=for-the-badge"
                alt="CrawlChat uptime status"
              />
            </a>
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
        className={cn(
          "flex items-center gap-2 cursor-pointer",
          "text-base-content/80 hover:text-base-content"
        )}
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

        <li>
          <Link
            className="flex gap-2 items-center group"
            to="/case-study/localstack"
          >
            <img
              src="/used-by/localstack.png"
              alt="LocalStack"
              className="max-h-5 inline-block grayscale group-hover:grayscale-0 transition-all"
            />
            LocalStack
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
        <li>
          <a href="/use-case">Use cases</a>
        </li>
        <li>
          <a href="/case-study">Case studies</a>
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
        className={cn(
          "flex items-center gap-2 cursor-pointer",
          "text-base-content/80 hover:text-base-content"
        )}
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

        <li>
          <Link
            className="flex flex-col gap-0 items-start"
            to="/use-case/customer-support-automation"
          >
            <span className="flex items-center gap-2">
              <TbMessage />
              Docs deflection for support teams
            </span>
            <span className="text-sm text-base-content/50">
              Deflect repetitive tickets with customer support automation
            </span>
          </Link>
        </li>

        <li>
          <Link
            className="flex flex-col gap-0 items-start"
            to="/use-case/discord-community-automation"
          >
            <span className="flex items-center gap-2">
              <TbBrandDiscord />
              Discord community automation
            </span>
            <span className="text-sm text-base-content/50">
              Automate Discord support with ticketing and moderation workflows
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
  const [isIsland, setIsIsland] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsIsland(window.scrollY > 24);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "sticky top-0 z-20",
        "transition-all duration-300",
        isIsland ? "px-3 pt-3 md:px-4" : ""
      )}
    >
      <nav
        className={cn(
          "flex items-center justify-between gap-2",
          "mx-auto max-w-[1200px]",
          "px-8 md:px-10 py-4",
          "transition-all duration-300",
          isIsland && "rounded-3xl border border-base-300",
          isIsland && "bg-base-100/85 shadow-md backdrop-blur-2xl"
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
            <a href="/app" className="btn btn-primary btn-soft hidden md:flex">
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

const testimonialProfiles = [
  { author: "Anton Lavrenov", authorImage: "/testi-profile/anton.png" },
  { author: "Maurits Koekoek", authorImage: "/testi-profile/maurits.jpeg" },
  { author: "Egelhaus", authorImage: "/testi-profile/egelhaus.png" },
  { author: "Clay Kramp", authorImage: "/testi-profile/clay.png" },
  { author: "Harsh Mishra", authorImage: "/testi-profile/harsh.jpeg" },
  { author: "Cristian Tăbăcitu", authorImage: "/testi-profile/cristian.jpg" },
  { author: "Jonny Burger", authorImage: "/testi-profile/jonny.jpg" },
];

function TestimonialAvatarStack() {
  return (
    <a
      href="#testimonials"
      aria-label="View testimonials"
      className={cn(
        "flex items-center mt-5 w-fit",
        "cursor-pointer transition-opacity hover:opacity-80"
      )}
    >
      {testimonialProfiles.map((profile, index) => (
        <img
          key={profile.author}
          src={profile.authorImage}
          alt={profile.author}
          className={cn(
            "size-8 rounded-full object-cover ring-2 ring-base-100",
            index > 0 && "-ml-2.5"
          )}
          style={{ zIndex: index + 1 }}
        />
      ))}
    </a>
  );
}

function Hero() {
  const { focusChangelog } = useLoaderData<typeof loader>();

  const wavyUnderline = cn(
    "underline decoration-wavy decoration-primary/40 underline-offset-[3px]"
  );

  const features: { text: ReactNode }[] = [
    {
      text: "Omni channel agent",
    },
    {
      text: "Connect multiple sources",
    },
    {
      text: "Citations",
    },
    {
      text: (
        <>
          Analytics to <span className={wavyUnderline}>improve your docs</span>
        </>
      ),
    },
  ];

  return (
    <div
      className={cn(
        "flex mb-10 flex-col md:flex-row gap-8 md:gap-10 lg:gap-12",
        "py-2 md:mt-6 w-full items-stretch"
      )}
    >
      <div
        className={cn(
          "flex flex-col flex-1 min-w-0",
          "items-start justify-center"
        )}
      >
        {focusChangelog && (
          <a
            className="mb-4 cursor-pointer hover:scale-[1.02] transition-all w-fit"
            href={`/changelog/${focusChangelog.slug}`}
          >
            <div
              className={cn(
                "bg-base-200 text-sm px-1.5 py-1 rounded-full",
                "flex items-center gap-2 pr-2 border",
                "border-base-300"
              )}
            >
              <span
                className={cn(
                  "px-2 bg-base-300 rounded-box text-xs",
                  "border border-base-content/10"
                )}
              >
                NEW
              </span>
              <span className="leading-none">{focusChangelog.title}</span>
              <span>
                <TbChevronRight />
              </span>
            </div>
          </a>
        )}

        <h1
          className={cn(
            "font-brand text-[36px] md:text-[48px] lg:text-[58px]",
            "text-left leading-[1.1]"
          )}
        >
          <span className="text-accent">AI answering agent</span> for your tech
          documentation
        </h1>

        <p
          className={cn(
            "md:text-lg mt-6 font-brand",
            "italic text-base-content/80",
            "text-left leading-relaxed"
          )}
        >
          CrawlChat is a documentation assistant for software products and{" "}
          <span className={wavyUnderline}>SaaS teams</span>. Turn your{" "}
          <span className={wavyUnderline}>tech documentation</span> and
          knowledge base into one AI agent that delivers accurate,
          citation-backed, source-linked answers on web, Discord, Slack, and
          multiple channels.
        </p>

        <ul className="mt-6 flex gap-x-4 gap-y-2 flex-wrap justify-start">
          {features.map((feature, index) => (
            <li key={index} className="flex gap-2 items-center">
              <TbCircleCheck size={20} className="text-primary" />
              <span className="md:text-lg text-base-content/80">
                {feature.text}
              </span>
            </li>
          ))}
        </ul>

        <div
          className={cn("flex gap-4 mt-8 flex-wrap", "flex-col sm:flex-row")}
        >
          <Link to="/pricing" className="btn btn-primary btn-xl">
            Start free trial
            <TbArrowRight />
          </Link>
        </div>
        <TestimonialAvatarStack />
      </div>

      <div
        className={cn(
          "flex-1 min-w-0 w-full md:max-w-[min(100%,420px)]",
          "md:ml-auto min-h-[420px] md:min-h-[520px]",
          "border border-accent rounded-box overflow-hidden"
        )}
      >
        <iframe
          src="https://crawlchat.app/w/crawlchat"
          title="CrawlChat documentation assistant"
          allow="clipboard-write"
          className={cn(
            "w-full h-full min-h-[420px] md:min-h-[520px]",
            "rounded-box border border-base-300 bg-base-100"
          )}
        />
      </div>
    </div>
  );
}

export function LandingPage({ children }: PropsWithChildren) {
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
}: {
  text: string | ReactNode;
  author: string;
  authorImage: string;
  authorLink: string;
  icon: ReactNode;
  authorCompany: string;
}) {
  return (
    <div className={cn("border border-base-300 rounded-box", "p-6 group")}>
      <p
        className={cn(
          "text-center text-base-content/80",
          "group-hover:text-base-content"
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

export function JonnyTestimonial() {
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
    />
  );
}

export function EgelhausTestimonial() {
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
    />
  );
}

export function AntonTestimonial() {
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
    />
  );
}

export function MauritsTestimonial() {
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
    />
  );
}

export function HarshTestimonial() {
  return (
    <CustomTestimonial
      text={
        <span>
          <CTH>CrawlChat</CTH> genuinely surprised us. The answers feel natural,
          contextual, and helpful, and the UX is a clear step up from other
          tools we evaluated. It’s quickly become valuable for our{" "}
          <CTHS>docs, support, and DevEx</CTHS> teams.
        </span>
      }
      author="Harsh Mishra"
      authorImage="/testi-profile/harsh.jpeg"
      authorLink="https://github.com/HarshCasper"
      icon={<TbBrandSlack />}
      authorCompany="LocalStack"
    />
  );
}

export function CristianTestimonial() {
  return (
    <CustomTestimonial
      text={
        <span>
          We moved from <span className="text-secondary italic">KapaAI</span> to{" "}
          <CTH>@crawlchat</CTH> and we wouldn't go back. Took us pbbly hours to
          migrate - we get the same functionality for <CTHS>10%</CTHS> of the
          cost. Plus, every time we needed help, the team at CrawlChat has been
          incredibly helpful and moved faster than expected. If you're in the
          market for a <CTH>RAG chatbot</CTH> for your documentation... you
          should definitely give <CTHS>CrawlChat</CTHS> a try.
        </span>
      }
      author="Cristian Tăbăcitu"
      authorImage="/testi-profile/cristian.jpg"
      authorLink="https://x.com/tabacitu/status/2031335648821494205"
      icon={<TbBrandX />}
      authorCompany="Backpack for Laravel"
    />
  );
}

export function ClayTestimonial() {
  return (
    <CustomTestimonial
      text={
        <span>
          <CTH>CrawlChat</CTH> has improved the <CTHS>user experience</CTHS> for
          everyone visiting <CTHS>docs.openc3.com</CTHS> with a self-serve way
          to interact with our documentation!
        </span>
      }
      author="Clay Kramp"
      authorImage="/testi-profile/clay.png"
      authorLink="https://www.linkedin.com/in/clayandgen/"
      icon={<TbBrandLinkedin />}
      authorCompany="OpenC3"
    />
  );
}

export function CustomTestimonials() {
  const columns = [
    [<JonnyTestimonial key={1} />, <AntonTestimonial key={2} />],
    [
      <MauritsTestimonial key={3} />,
      <EgelhausTestimonial key={4} />,
      <ClayTestimonial key={7} />,
    ],
    [<HarshTestimonial key={5} />, <CristianTestimonial key={6} />],
    ,
  ];
  return (
    <div id="testimonials" className="mt-32 flex flex-col gap-10 scroll-mt-24">
      <div className="flex flex-col md:flex-row gap-4">
        {columns.map((testimonial, index) => (
          <div key={index} className="flex-1 flex flex-col gap-4">
            {testimonial}
          </div>
        ))}
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
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/march-2026/summary.png",
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
    {
      title: "Add your docs",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/march-2026/new-group.png",
      icon: <TbBook />,
    },
    {
      title: "View knowledge",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/march-2026/groups.png",
      icon: <TbBook2 />,
    },
    {
      title: "Embed AI",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/march-2026/customise-widget.png",
      icon: <TbCode />,
    },
    {
      title: "Categories",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/march-2026/categories.png",
      icon: <TbFolder />,
      new: true,
    },
    {
      title: "Conversations",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/march-2026/questions.png",
      icon: <TbMessage />,
    },
    {
      title: "Data gaps",
      img: "https://slickwid-public.s3.us-east-1.amazonaws.com/crawlchat/gallery/march-2026/data-gaps.png",
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
              activeStep === index && "bg-primary/10 text-primary",
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
              <span className="loading loading-spinner loading-lg" />
              <p className="text-lg opacity-70">Loading...</p>
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
                <div key={`${i}-${source.title}-${index}`} className="shrink-0">
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
      <h4 className="text-xl font-brand font-medium">{title}</h4>
      <p className="text-base-content/70 leading-relaxed">{description}</p>
    </div>
  );
}

function Why() {
  const benefits = [
    {
      icon: <TbCode />,
      title: "For Software Companies",
      description:
        "CrawlChat is tailored for technical documentation and developer workflows. It lets you connect your GitHub issues, GitHub code repositories, Notion pages, Confluence pages, Linear issues, and more, that are very specific for software companies. It also lets you deploy the chatbot on Discord, Slack, MCP servers which again are very specific for software companies.",
    },
    {
      icon: <TbGraph />,
      title: "Insights",
      description:
        "Other solutions just stop at answering the questions. CrawlChat provides you analytics, categorisation, sentiment analysis, and more, that help you improve your documentation and product.",
    },
    {
      icon: <TbGlobe />,
      title: "Omni Channel",
      description:
        "CrawlChat is one-stop solution to deploy the chatbot on multiple channels, including Discord, Slack, MCP servers, API, Websites and more.",
    },
    {
      icon: <TbMoneybag />,
      title: "Affordable & Open Source",
      description:
        "CrawlChat is the most affordable Ask AI solution for software companies with all the tools required to make your users happy. The pricing is clear and transparent unlike other platforms. CrawlChat is also open source and you can self-host it for yourself.",
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

      <p className="text-2xl text-center max-w-3xl opacity-70">
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

export default function Landing() {
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

      <Container>
        <Works />
      </Container>

      <Container>
        <CreateKnowledgeBase />
      </Container>

      <Container>
        <Channels />
      </Container>

      <Container>
        <Analyse />
      </Container>

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
        <PricingFeatureComparison />
      </Container>

      <Container>
        <PricingTopups />
      </Container>

      <SourcesChannels />

      <Container>
        <div className="flex flex-col mt-32">
          <Heading>Frequently Asked Questions</Heading>
          <Faq items={landingFaqItems} className="mt-20" />
        </div>
      </Container>
    </>
  );
}

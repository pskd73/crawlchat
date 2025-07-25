import { useState, type PropsWithChildren, type ReactNode } from "react";
import cn from "@meltdownjs/cn";
import "../tailwind.css";
import "../fonts.css";
import {
  TbArrowRight,
  TbArrowsShuffle,
  TbBrandDiscord,
  TbBrandLinkedin,
  TbBrandSlack,
  TbBrandX,
  TbChartBar,
  TbChevronDown,
  TbChevronRight,
  TbChevronUp,
  TbClock,
  TbDatabase,
  TbFile,
  TbMessage,
  TbRobotFace,
  TbScoreboard,
  TbSettings,
  TbSpider,
  TbWorld,
} from "react-icons/tb";
import { prisma } from "libs/prisma";
import type { Route } from "./+types/page";
import { Box, Text } from "@chakra-ui/react";

export function meta() {
  return [
    {
      title: "CrawlChat - AI Chatbot for your documentation and support",
    },
    {
      name: "description",
      content:
        "Make AI chatbot from your documentation that handles your support queries. Embed it in your website, Discord, or Slack.",
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

export function Logo() {
  return (
    <a className="flex items-center gap-2" href="/">
      <img src="/logo.png" alt="CrawlChat" width={38} height={38} />
      <span className="text-2xl font-radio-grotesk text-brand">CrawlChat</span>
    </a>
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

function StatsItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex gap-4 py-6 px-6 items-center border-b border-outline last:border-b-0">
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

export function Heading({ children }: PropsWithChildren) {
  return (
    <h3 className="text-center text-4xl md:text-5xl max-w-[300px] md:max-w-[640px] mx-auto font-radio-grotesk leading-[1.3]">
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
          "border border-brand mb-4"
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
      <h3 className="text-2xl font-radio-grotesk flex items-center gap-2">
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
            { text: "40 message credits" },
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
            { text: "2000 message credits/month" },
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
            { text: "7000 message credits/month" },
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

export function CTA({ text }: { text?: string }) {
  return (
    <div className="mt-32">
      <div className="w-full bg-gradient-to-b from-canvas to-ash shadow-md rounded-2xl py-20 px-10 relative">
        <h2 className="font-radio-grotesk text-[42px] md:text-[42px] leading-[1.2] font-medium text-center max-w-[800px] mx-auto">
          {text ||
            "Make your documents and knowledge base be powered by AI now!"}
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
          <NavLink href="/#pricing">Pricing</NavLink>
          <NavLink href="/support-tickets">Support tickets</NavLink>
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
    <div className="py-4">
      <a
        className="flex justify-center mb-8 cursor-pointer hover:scale-[1.02] transition-all"
        href="/support-tickets"
      >
        <div className="bg-red-50 text-sm px-1.5 py-1 rounded-full flex items-center gap-2 pr-2 border border-red-300 text-red-700">
          <span className="px-2 bg-red-200 rounded-full font-medium border border-red-300">
            NEW
          </span>
          <span className="leading-none">
            Added support for support tickets
          </span>
          <span>
            <TbChevronRight />
          </span>
        </div>
      </a>

      <h1 className="font-radio-grotesk text-[42px] md:text-[64px] leading-[1.2] text-center max-w-[800px] mx-auto">
        <span className="text-brand">AI Chatbot</span> for your documentation
        and <span className="text-brand">support</span>
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
        "rounded-2xl bg-canvas border border-outline p-6 flex flex-col justify-between gap-4",
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
          className="border border-outline rounded-lg"
        />
      </div>
    </div>
  );
}

export function Flow() {
  return (
    <div className="mt-32">
      <Heading>
        A simple <HeadingHighlight>AI first</HeadingHighlight> support workflow
      </Heading>

      <HeadingDescription>
        CrawlChat is a simple yet powerful, AI first support system for your
        products and services. It includes a AI chatbot and traditional support
        ticketing system for the best support experience for your customers.
      </HeadingDescription>

      <div
        className={cn(`grid grid-cols-1 grid-rows-[4] md:grid-cols-3 gap-6`)}
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
    <div className="border-r-0 md:border-r border-b md:border-b-0 border-outline p-6 last:border-r-0 last:border-b-0">
      <p className="text-xl font-radio-grotesk text-center italic">{text}</p>

      <div className="flex flex-col justify-center gap-2 mt-8">
        <div className="flex flex-col items-center">
          <img
            src={authorImage}
            alt={author}
            className="w-16 h-16 rounded-full border border-outline"
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
    <span className="bg-brand-subtle text-brand px-2 mx-1 whitespace-nowrap">
      {children}
    </span>
  );
}

function CTHS({ children }: PropsWithChildren) {
  return <span className="text-brand font-bold">{children}</span>;
}

export function CustomTestimonials() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 border border-outline rounded-2xl mt-32 bg-canvas">
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
      <CustomTestimonial
        text={
          <div>
            Can wholeheartedly <CTH>recommend this</CTH>. The number of support
            calls to 270 Degrees significantly <CTH>dropped</CTH> after we
            implemented <CTHS>CrawlChat</CTHS>.
          </div>
        }
        author="Maurits Koekoek"
        authorImage="https://media.licdn.com/dms/image/v2/D4E03AQG-zmBs0zHLvA/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1683012930288?e=1756339200&v=beta&t=MxfQWsU6WS3fxC1vAKYR_bb-z-sfNfXIAcEWXBw2iQA"
        authorLink="https://www.linkedin.com/feed/update/urn:li:activity:7353688013584977920?commentUrn=urn%3Ali%3Acomment%3A%28activity%3A7353688013584977920%2C7353699420036571137%29&dashCommentUrn=urn%3Ali%3Afsd_comment%3A%287353699420036571137%2Curn%3Ali%3Aactivity%3A7353688013584977920%29"
        icon={<TbBrandLinkedin />}
        authorCompany="270 Degrees"
      />
    </div>
  );
}

function FAQ() {
  const questions = [
    {
      question: <span>How do I train the AI chatbot?</span>,
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
      question: <span>I already user other chatbot, why do I switch?</span>,
      answer: (
        <p>
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
        </p>
      ),
    },
    {
      question: <span>Do I need to bring my own OpenAI API key?</span>,
      answer: (
        <p>
          No, CrawlChat uses the latest LLM models from OpenAI, Anthropic,
          Google, and Gemini. You can use the chatbot without any API key. You
          can choose the model that best suits your needs from the dashboard.
        </p>
      ),
    },
    {
      question: <span>Does it support other languages?</span>,
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
      question: <span>Can I try it out first?</span>,
      answer: (
        <p>
          You can signup without paying anything and try out adding your
          knowledge base, integrating the chatbot to your website. You can check
          the{" "}
          <a href="/#pricing" className="text-brand">
            pricing
          </a>{" "}
          section for more details about the credits.
        </p>
      ),
    },
    {
      question: <span>How can I integrate the chatbot to my website?</span>,
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
      question: <span>How can add chatbot to Slack or Discord?</span>,
      answer: (
        <p>
          Yes! CrawlChat provides a Discord bot and a Slack app that can be
          integrated with your Discord or Slack server. You can find the
          instructions to integrate the chatbot to your Discord or Slack server
          in the{" "}
          <a href="/discord-bot" className="text-brand">
            Discord bot
          </a>{" "}
          and Slack app pages. Once added to the channel or server, your
          community can tag <span className="text-brand">@CrawlChat</span> to
          ask questions to get the answers.
        </p>
      ),
    },
    {
      question: <span>What kind of analytics does it provide?</span>,
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
      question: <span>How does Support Ticket System work?</span>,
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
      question: <span>How can I customise the Ask AI widget?</span>,
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

  return (
    <div className="flex flex-col mt-32">
      <Heading>
        Frequently Asked Questions
      </Heading>

      <div className="mt-20">
        {questions.map((question, index) => (
          <div key={index} className="border-b border-outline last:border-b-0">
            <div
              className={cn(
                "flex justify-between text-2xl cursor-pointer py-8",
                "hover:text-brand",
                active === index && "text-brand"
              )}
              onClick={() => setActive(active === index ? undefined : index)}
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
    </div>
  );
}

export default function Landing({ loaderData }: Route.ComponentProps) {
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
        <CustomTestimonials />
      </Container>

      <Container>
        <Flow />
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

      {/* <Container>
        <Testimonials />
      </Container> */}

      <Container>
        <FAQ />
      </Container>

      <Container>
        <CTA />
      </Container>

      <Footer />
    </LandingPage>
  );
}

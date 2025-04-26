import type { PropsWithChildren } from "react";
import cn from "@meltdownjs/cn";
import "../tailwind.css";
import { TbArrowRight } from "react-icons/tb";

function Container({ children }: PropsWithChildren) {
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
    <a href="#" className="font-medium hover:underline">
      {children}
    </a>
  );
}

function Button({
  children,
  className,
  variant = "outline",
}: PropsWithChildren & { className?: string; variant?: "solid" | "outline" }) {
  return (
    <a
      className={cn(
        "font-medium border text-brand border-brand rounded-xl px-6 py-1 flex items-center justify-center gap-2",
        "cursor-pointer hover:bg-brand hover:text-white transition-all",
        variant === "solid" && "bg-brand text-white",
        className
      )}
    >
      {children}
    </a>
  );
}

function Scrape() {
  return (
    <div>
      <div className="flex items-center gap-2 justify-center max-w-[400px] mx-auto mb-8">
        <div className="border border-outline rounded-2xl p-1 shadow-lg flex items-center gap-2 pl-6 text-xl w-full bg-white">
          <input
            type="text"
            className="w-full bg-transparent outline-none"
            placeholder="https://example.com"
          />
          <button className="bg-brand text-white px-6 py-4 rounded-2xl flex-shrink-0 font-medium">
            Try it
          </button>
        </div>
      </div>

      <p className="text-center text-sm opacity-40">
        Fetches 25 pages and makes it LLM ready!
      </p>
    </div>
  );
}

function DemoWindow() {
  return (
    <div className="max-w-[900px] w-full mx-auto border border-outline shadow-md bg-ash mt-8 px-4 py-3 rounded-2xl">
      <div>
        <div className="flex items-center gap-1 mb-3">
          <div className="w-[10px] h-[10px] bg-red-500 rounded-full" />
          <div className="w-[10px] h-[10px] bg-yellow-500 rounded-full" />
          <div className="w-[10px] h-[10px] bg-green-500 rounded-full" />
        </div>
      </div>
      <div className="bg-white rounded-lg aspect-[16/12]"></div>
    </div>
  );
}

function StatsItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex gap-4 py-6 px-6 items-center border-b border-outline last:border-b-0">
      <div className="flex-1 text-6xl font-bold font-radio-grotesk">
        {value}
      </div>
      <div className="flex-1 flex justify-end">{label}</div>
    </div>
  );
}

function Stats() {
  return (
    <div className="flex gap-8 w-full mt-8 items-center">
      <div className="flex-1 flex flex-col gap-10">
        <div className="text-xl font-medium px-6 py-3 shadow-md rounded-2xl bg-white w-fit flex items-center gap-4 -rotate-[4deg]">
          <div className="w-3 h-3 bg-green-500 rounded-full outline-2 outline-green-300 outline" />
          Answering questions continuously
        </div>
        <h3 className="text-5xl font-radio-grotesk font-bold leading-[1.2]">
          Answering <br />
          <span className="text-brand">questions</span> <br />
          continuously
        </h3>
      </div>

      <div className="flex-1 shadow-md bg-white rounded-2xl">
        <StatsItem label="Today" value={272} />
        <StatsItem label="In the last week" value={2220} />
        <StatsItem label="In the last month" value={7223} />
      </div>
    </div>
  );
}

function UsedBy() {
  return (
    <div className="flex flex-col gap-8">
      <h3 className="text-center text-xl font-medium opacity-50">
        Already used by awesome companies!
      </h3>

      <div className="flex justify-center items-center gap-16">
        <img
          src="/used-by/remotion.png"
          alt="Remotion"
          className="max-h-[38px]"
        />

        <div className="flex items-center gap-2">
          <img
            src="/used-by/konvajs.png"
            alt="Konva"
            className="max-h-[38px]"
          />
          <div className="font-medium text-xl">Konvajs</div>
        </div>
      </div>
    </div>
  );
}

function Heading({ children }: PropsWithChildren) {
  return (
    <h3 className="text-center text-6xl font-bold max-w-[640px] mx-auto font-radio-grotesk leading-[1.3]">
      {children}
    </h3>
  );
}

function HeadingHighlight({ children }: PropsWithChildren) {
  return (
    <span className="text-brand bg-brand-subtle px-4 py-1 rounded-lg">
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
    <div className="p-6 rounded-2xl bg-white shadow-md flex-1 pb-10">
      <h4 className="text-2xl font-bold mb-2 font-radio-grotesk">{title}</h4>
      <p className="text opacity-60 mb-8 leading-tight">{description}</p>

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

function Works() {
  return (
    <div className="mt-32">
      <Heading>
        Works in <HeadingHighlight>three</HeadingHighlight> simple steps
      </Heading>

      <HeadingDescription>
        CrawlChat has a very simple workflow at its core. In three simple steps
        you can turn your docs into LLM ready for your community.
      </HeadingDescription>

      <div className="flex gap-8">
        <WorksBox
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
          <div className="flex flex-col relative">
            <div className="flex justify-center">
              <img
                src="new-landing/integrate-lines.png"
                className="w-[180px] translate-y-[32px]"
              />
            </div>

            <img
              src="/new-landing/docs.png"
              alt="Docs"
              className="w-20 h-20 absolute top-0 left-0 right-0 mx-auto"
            />

            <div className="flex justify-center gap-2 absolute left-0 bottom-0 translate-y-8 -translate-x-1">
              <IntegrateChip label="Ask AI" icon="/new-landing/ai.png" />
            </div>
            <div className="flex justify-center gap-2 absolute right-0 bottom-0 translate-y-8 translate-x-1">
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
        </WorksBox>
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

function Tab({ children, active }: PropsWithChildren & { active?: boolean }) {
  return (
    <div
      className={cn(
        "px-4 py-1 rounded-xl font-bold opacity-60 text-lg font-radio-grotesk border border-transparent hover:border-outline cursor-pointer",
        active && "bg-white shadow opacity-100 hover:border-transparent"
      )}
    >
      {children}
    </div>
  );
}

function ImportKnowledgePreview() {
  return (
    <div className="w-full h-[700px] bg-ash-subtle rounded-2xl bg-white bg-opacity-50 flex flex-col gap-4 p-4 border border-outline">
      <div className="flex flex-col gap-2">
        <p className="text-2xl font-bold">Group</p>
        <p className="font-medium opacity-50">
          Knowledge bases are maintained as groups for easy maintenance. You can
          set up auto updates on the groups & get analytics on each group.
        </p>
      </div>
      <div className="w-full flex-1 bg-white rounded-xl p-4">Inside</div>
    </div>
  );
}

function ImportKnowledge() {
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
            <Tab active>Groups</Tab>
            <Tab>Scrape</Tab>
            <Tab>Think</Tab>
          </Tabs>
        </div>

        <ImportKnowledgePreview />
      </div>
    </div>
  );
}

function IntegrationCard({
  flex,
  title,
  description,
}: {
  flex: number;
  title: string;
  description: string;
}) {
  return (
    <div
      className={
        "p-4 shadow-md border border-outline rounded-xl bg-white flex flex-col gap-4"
      }
      style={{ flex: flex }}
    >
      <div className="h-[200px] bg-ash rounded-lg" />
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-bold font-radio-grotesk">{title}</h3>
        <p className="opacity-50 font-medium leading-tight">{description}</p>
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
        <div className="flex gap-6">
          <IntegrationCard
            flex={4}
            title="Ask AI button"
            description="A drop in embed code to add the Ask AI button on your docs website. All the visitors to your docs can now quickly ask their question."
          />
          <IntegrationCard
            flex={6}
            title="Discord bot"
            description="CrawlChat focuses on giving a wholesome integration experience by providing Discord bot that can answer questions from your community by just tagging it."
          />
        </div>

        <div className="flex gap-6">
          <IntegrationCard
            flex={6}
            title="Slack bot"
            description="CrawlChat focuses on giving a wholesome integration experience by providing Slack bot that can answer questions from your community by just tagging it."
          />
          <IntegrationCard
            flex={4}
            title="MCP server"
            description="You will not be missed by the next gen developers. CrawlChat provides the MCP server out of the box."
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
}: {
  active: boolean;
  title: string;
  description: string;
  img: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 border border-transparent hover:border-outline gap-2 flex flex-col",
        "cursor-pointer",
        active && "bg-white shadow-md hover:border-transparent"
      )}
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

      <div className="flex gap-10">
        <div className="flex-1 flex flex-col gap-4">
          <ChatWidgetFeature
            active={true}
            title="Your sources"
            description="All the answers on the chat widget are provided by the resources that the answer is fetched from so that your community can always go find more help if required."
            img="/new-landing/archive-active.png"
          />
          <ChatWidgetFeature
            active={false}
            title="Code blocks"
            description="CrawlChat supports showing code blocks and your community can just copy and paste the generated code to their workflow."
            img="/new-landing/app-programming.png"
          />
          <ChatWidgetFeature
            active={false}
            title="Pin"
            description="Your community can pin the important answers so that they can always come back and find the critical help with ease"
            img="/new-landing/pin.png"
          />
        </div>
        <div className="flex-1 bg-ash-strong rounded-2xl p-4 shadow-md border border-outline aspect-square"></div>
      </div>
    </div>
  );
}

function ToolsRow({ children }: PropsWithChildren) {
  return <div className="flex">{children}</div>;
}

function ToolItem({
  title,
  description,
  icon,
  noBorderBottom,
}: {
  title: string;
  description: string;
  icon: string;
  noBorderBottom?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex-1 flex flex-col gap-2 p-6 border-r border-opacity-60 border-outline last:border-r-0",
        !noBorderBottom && "border-b"
      )}
    >
      <div className="flex flex-col gap-2">
        <img src={icon} alt={title} className="w-6 h-6" />
        <h3 className="text-xl font-bold font-radio-grotesk">{title}</h3>
      </div>
      <p className="opacity-50 font-medium leading-tight">{description}</p>
    </div>
  );
}

function Tools() {
  return (
    <div className="mt-32">
      <Heading>
        All the <HeadingHighlight>tools</HeadingHighlight> to improve your docs
      </Heading>

      <HeadingDescription>
        CrawlChat has quick to import options for multiple sources that cover
        most of your use cases.
      </HeadingDescription>

      <div className="bg-white rounded-2xl border border-outline">
        <ToolsRow>
          <ToolItem
            title="Scoring"
            description="All the answers and conversations are given a score that represent how relevant the sources are for the question asked. Low score means not enough data, a chance to improve"
            icon="/new-landing/ring-chart.png"
          />
          <ToolItem
            title="Analytics"
            description="You get a wide range of analytics for your docs and community. The daily messages chart, score distribution and many more that give your more visibility into your docs and the community"
            icon="/new-landing/graph-up.png"
          />
          <ToolItem
            title="Dense groups"
            description="You get to know how each knowledge group is performing against the questions asked. You can always improve them if they are not performing as expected"
            icon="/new-landing/heirarchy-square.png"
          />
        </ToolsRow>
        <ToolsRow>
          <ToolItem
            title="@CrawlChat to answer"
            description="You don’t have to be available on the channels all the time. Members and just tag @crawlchat to get the answer for the questions they have."
            icon="/new-landing/chat-bubble.png"
            noBorderBottom
          />
          <ToolItem
            title="Learn"
            description="Turn the conversations you have on the channels into a knowledge base with just a @crawlchat learn message. The bot adds the whole conversation into the knowledge group so that it uses it in the upcoming answers"
            icon="/new-landing/online-learning.png"
            noBorderBottom
          />
          <ToolItem
            title="Drafting"
            description="Get more control on the help you provide on your channels. Use CrawlChat to draft answers for the questions so that you can minimise your efforts in answering them end to end. Automate manually!"
            icon="/new-landing/edit-pen.png"
            noBorderBottom
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
}: {
  popular?: boolean;
  title: string;
  description: string;
  price: string;
  items: PricingItem[];
  free?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex-1 bg-white shadow-md border border-outline rounded-2xl relative",
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
          popular && "border-brand border-opacity-20"
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
          <Button className="w-full" variant={popular ? "solid" : "outline"}>
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
    <div className="mt-32">
      <Heading>
        <HeadingHighlight>Pricing</HeadingHighlight> for everyone
      </Heading>

      <div className="flex gap-6 mt-20">
        <PricingBox
          free
          title="Free"
          description="For personal use"
          price="$0"
          items={[
            { text: "100 messages per month" },
            { text: "100 messages per month" },
            { text: "API not available", excluded: true },
          ]}
        />
        <PricingBox
          title="Starter"
          description="Start your journey with CrawlChat"
          price="$29"
          items={[
            { text: "100 messages per month" },
            { text: "100 messages per month" },
            { text: "API available" },
          ]}
        />
        <PricingBox
          title="Pro"
          description="For power users and teams"
          popular
          price="$79"
          items={[
            { text: "100 messages per month" },
            { text: "100 messages per month" },
            { text: "API available" },
          ]}
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

      <div className="flex gap-6 mt-20">
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
        </div>
      </div>
    </div>
  );
}

function CTA() {
  return (
    <div className="mt-32">
      <div className="w-full bg-gradient-to-b from-white to-ash shadow-md rounded-2xl py-20 relative">
        <div className="absolute top-[20%] left-[8%] rotate-[-24deg] scale-120 opacity-50">
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
        </div>

        <Heading>
          Ready to make your <HeadingHighlight>docs</HeadingHighlight> LLM
          ready?
        </Heading>

        <HeadingDescription>
          Join users who are already having meaningful conversations with web
          content using CrawlChat.
        </HeadingDescription>

        <div className="flex justify-center">
          <a
            href="#"
            className="px-12 py-4 bg-brand text-white font-medium rounded-2xl text-xl"
          >
            Get started
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

function Footer() {
  return (
    <div className="bg-white mt-32 border-t border-outline">
      <Container>
        <div className="py-8 flex">
          <div className="flex-[2] flex flex-col gap-4">
            <Logo />
            <p className="font-medium opacity-60">Deliver your docs with AI!</p>
            <p className="opacity-50 text-xs mt-4 font-medium">
              © 2025 CrawlChat
            </p>
          </div>
          <div className="flex-[2]">
            <ul className="flex flex-col gap-4">
              <li>
                <FooterLink href="#">
                  How to add AI Chatbot for your docs
                </FooterLink>
              </li>
              <li>
                <FooterLink href="#">Documentation - Use case</FooterLink>
              </li>
              <li>
                <FooterLink href="#">Setup MCP server</FooterLink>
              </li>
              <li>
                <FooterLink href="#">How Discord Bot helps?</FooterLink>
              </li>
            </ul>
          </div>
          <div className="flex-[1]">
            <ul className="flex flex-col gap-4">
              <li>
                <FooterLink href="#">Home</FooterLink>
              </li>
              <li>
                <FooterLink href="#">Pricing</FooterLink>
              </li>
              <li>
                <FooterLink href="#">Use cases</FooterLink>
              </li>
              <li>
                <FooterLink href="#">Features</FooterLink>
              </li>
              <li>
                <FooterLink href="#">Guides</FooterLink>
              </li>
              <li>
                <FooterLink href="#">Roadmap</FooterLink>
              </li>
              <li>
                <FooterLink href="#">Blog</FooterLink>
              </li>
            </ul>
          </div>
          <div className="flex-[1]">
            <ul className="flex flex-col gap-4">
              <li>
                <FooterLink href="#">Terms</FooterLink>
              </li>
              <li>
                <FooterLink href="#">Privacy policy</FooterLink>
              </li>
            </ul>

            <ul className="flex gap-6 mt-4">
              <li>
                <a href="#">
                  <img
                    src="/new-landing/mail.png"
                    alt="Mail"
                    className="w-4 h-4"
                  />
                </a>
              </li>
              <li>
                <a href="#">
                  <img src="/new-landing/x.png" alt="X" className="w-4 h-4" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </Container>
    </div>
  );
}

function Nav() {
  return (
    <nav className="flex items-center justify-between gap-2 lg:py-6">
      <Logo />

      <div className="flex items-center gap-8">
        <div className="items-center gap-8 hidden md:flex">
          <NavLink href="#">How it works</NavLink>
          <NavLink href="#">Features</NavLink>
          <NavLink href="#">Pricing</NavLink>
        </div>

        <Button>Login</Button>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <div className="py-8">
      <h1 className="font-radio-grotesk text-[42px] md:text-[80px] leading-[1.4] md:leading-[1.3] font-bold text-center max-w-[90%] md:max-w-[75%] mx-auto">
        Deliver your{" "}
        <span className="text-brand bg-brand-subtle px-3 rounded-lg relative inline-block">
          documentation
          <img
            src="/new-landing/docs-h1.png"
            alt="Docs"
            className={cn(
              "absolute left-[-34px] top-[-30px] w-[68px] h-[68px] ",
              "md:w-[120px] md:h-[120px] md:top-[-50px] md:left-[-80px]"
            )}
          />
        </span>{" "}
        with{" "}
        <span className="text-brand bg-brand-subtle px-3 rounded-lg">AI</span>
      </h1>

      <h2 className="text-center text-xl font-medium max-w-[800px] mx-auto py-8 opacity-60">
        Add your existing documentation as knowledge base and deliver it through
        multiple channels for your community. Get visibility how your community
        consumes it and make your documentation better!
      </h2>

      <Scrape />

      <DemoWindow />
    </div>
  );
}

export default function LandingV2() {
  return (
    <div className="bg-ash font-aeonik">
      <div className="aspect-[1440/960] w-full bg-[url('/clouds.png')] bg-contain bg-no-repeat absolute top-0 left-0">
        <div className="w-full h-full bg-gradient-to-b from-[rgba(246,246,245,0)] to-ash"></div>
      </div>

      <div className="relative">
        <Container>
          <Nav />
        </Container>

        <Container>
          <Hero />
        </Container>

        {/* <Container>
          <UsedBy />
        </Container>

        <Container>
          <Stats />
        </Container>

        <Container>
          <Works />
        </Container>

        <Container>
          <ImportKnowledge />
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

        <Footer /> */}
      </div>
    </div>
  );
}

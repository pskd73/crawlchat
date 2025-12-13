import type { Route } from "./+types/customise";
import type {
  Message,
  Scrape,
  WidgetConfig,
  WidgetQuestion,
  WidgetSize,
} from "libs/prisma";
import { prisma } from "~/prisma";
import { getAuthUser } from "~/auth/middleware";
import { SettingsSection } from "~/settings-section";
import { useFetcher } from "react-router";
import { authoriseScrapeUser, getSessionScrapeId } from "../scrapes/util";
import { useEffect, useMemo, useState } from "react";
import { ChatBoxProvider } from "~/widget/use-chat-box";
import ChatBox, { ChatboxContainer } from "~/widget/chat-box";
import {
  TbHome,
  TbMessage,
  TbPlus,
  TbTrash,
  TbX,
} from "react-icons/tb";
import cn from "@meltdownjs/cn";
import { makeMeta } from "~/meta";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const scrape = await prisma.scrape.findUnique({
    where: {
      id: scrapeId,
    },
    include: {
      user: true,
    },
  });

  return { scrape };
}

export function meta({ data }: Route.MetaArgs) {
  return makeMeta({
    title: "Customise - CrawlChat",
  });
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const scrape = await prisma.scrape.findUnique({
    where: {
      id: scrapeId,
    },
    include: {
      user: true,
    },
  });

  if (!scrape) {
    throw new Response("Not found", { status: 404 });
  }

  const formData = await request.formData();
  const size = formData.get("size");
  const questions = formData.getAll("questions");
  const welcomeMessage = formData.get("welcomeMessage");

  const update: WidgetConfig = scrape.widgetConfig ?? {
    size: "small",
    questions: [],
    welcomeMessage: null,
    showMcpSetup: null,
    textInputPlaceholder: null,
    primaryColor: null,
    buttonText: null,
    buttonTextColor: null,
    showLogo: null,
    tooltip: null,
    logoUrl: null,
    applyColorsToChatbox: null,
    title: null,
    hideBranding: null,
  };

  if (size) {
    update.size = size as WidgetSize;
  }
  if (formData.has("from-questions")) {
    update.questions = questions.map((text) => ({ text: text as string }));
  }
  if (welcomeMessage !== null && welcomeMessage !== undefined) {
    update.welcomeMessage = welcomeMessage as string;
  }
  if (formData.has("from-mcp-setup")) {
    update.showMcpSetup = formData.get("showMcpSetup") === "on";
  }
  if (formData.has("textInputPlaceholder")) {
    update.textInputPlaceholder = formData.get(
      "textInputPlaceholder"
    ) as string;
  }
  if (formData.has("primaryColor")) {
    update.primaryColor = formData.get("primaryColor") as string;
    update.primaryColor = ["null", "#abcdef"].includes(update.primaryColor)
      ? null
      : update.primaryColor;
  }
  if (formData.has("buttonText")) {
    update.buttonText = formData.get("buttonText") as string;
  }
  if (formData.has("buttonTextColor")) {
    update.buttonTextColor = formData.get("buttonTextColor") as string;
    update.buttonTextColor = ["null", "#abcdef"].includes(
      update.buttonTextColor
    )
      ? null
      : update.buttonTextColor;
  }
  if (formData.has("from-widget")) {
    update.showLogo = formData.get("showLogo") === "on";
  }
  if (formData.has("logoUrl")) {
    update.logoUrl = formData.get("logoUrl") as string;
  }
  if (formData.has("tooltip")) {
    update.tooltip = formData.get("tooltip") as string;
  }
  if (formData.has("from-widget")) {
    update.applyColorsToChatbox = formData.get("applyColorsToChatbox") === "on";
  }
  if (formData.has("title")) {
    update.title = formData.get("title") as string;
  }
  if (formData.has("from-hide-branding")) {
    if (!scrape.user?.plan?.brandRemoval?.subscriptionId) {
      return { error: "Brand removal subscription required" };
    }
    update.hideBranding = formData.get("hideBranding") === "on";
  }

  await prisma.scrape.update({
    where: {
      id: scrape.id,
    },
    data: {
      widgetConfig: update,
    },
  });

  return null;
}

const DEFAULT_MESSAGE: Message = {
  id: "test",
  scrapeId: "test",
  createdAt: new Date(),
  updatedAt: new Date(),
  threadId: "test",
  ownerUserId: "test",
  questionId: "test",
  llmMessage: {
    role: "assistant",
    content: "A dummy message",
  },
  pinnedAt: null,
  channel: null,
  rating: null,
  correctionItemId: null,
  slackMessageId: null,
  analysis: null,
  discordMessageId: null,
  links: [],
  ticketMessage: null,
  apiActionCalls: [],
  llmModel: "gpt_4o_mini",
  creditsUsed: 0,
  attachments: [],
  fingerprint: "test",
};

function AskAIButton({
  bg,
  color,
  text,
}: {
  bg?: string | null;
  color?: string | null;
  text?: string | null;
}) {
  return (
    <div
      className="bg-[#7b2cbf] text-white px-5 py-2 rounded-full transition-all cursor-pointer hover:scale-105"
      style={{
        backgroundColor: bg ?? "#7b2cbf",
        color: color ?? "white",
      }}
    >
      {text || "Ask AI"}
    </div>
  );
}

function ColorPicker({
  name,
  label,
  color,
  setColor,
  onClear,
}: {
  name: string;
  label: string;
  color: string | null | undefined;
  setColor: (color: string | null) => void;
  onClear: () => void;
}) {
  return (
    <fieldset className="fieldset flex-1 flex gap-2 items-end">
      <legend className="fieldset-legend">{label}</legend>
      <input
        type="color"
        name={name}
        value={color ?? "#abcdef"}
        onChange={(e) =>
          !e.target.value.includes("abcdef") && setColor(e.target.value)
        }
        className="input w-12 px-1"
        placeholder={"Pick a color"}
      />
      <button className="btn btn-square" onClick={onClear} type="button">
        <TbX />
      </button>
    </fieldset>
  );
}

export default function ScrapeCustomise({ loaderData }: Route.ComponentProps) {
  const widgetConfigFetcher = useFetcher();
  const questionsFetcher = useFetcher();
  const welcomeMessageFetcher = useFetcher();
  const mcpSetupFetcher = useFetcher();
  const textInputPlaceholderFetcher = useFetcher();
  const hideBrandingFetcher = useFetcher();
  const [questions, setQuestions] = useState<WidgetQuestion[]>(
    loaderData.scrape?.widgetConfig?.questions ?? []
  );

  const [primaryColor, setPrimaryColor] = useState(
    loaderData.scrape?.widgetConfig?.primaryColor
  );
  const [buttonTextColor, setButtonTextColor] = useState(
    loaderData.scrape?.widgetConfig?.buttonTextColor
  );
  const [buttonText, setButtonText] = useState(
    loaderData.scrape?.widgetConfig?.buttonText
  );
  const [tooltip, setTooltip] = useState(
    loaderData.scrape?.widgetConfig?.tooltip
  );
  const [showLogo, setShowLogo] = useState(
    loaderData.scrape?.widgetConfig?.showLogo ?? false
  );
  const [logoUrl, setLogoUrl] = useState(
    loaderData.scrape?.widgetConfig?.logoUrl
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    loaderData.scrape?.widgetConfig?.welcomeMessage
  );
  const [showMcpSetup, setShowMcpSetup] = useState(
    loaderData.scrape?.widgetConfig?.showMcpSetup ?? true
  );
  const [textInputPlaceholder, setTextInputPlaceholder] = useState(
    loaderData.scrape?.widgetConfig?.textInputPlaceholder
  );
  const [applyColorsToChatbox, setApplyColorsToChatbox] = useState(
    loaderData.scrape?.widgetConfig?.applyColorsToChatbox ?? false
  );
  const [title, setTitle] = useState(loaderData.scrape?.widgetConfig?.title);
  const [hideBranding, setHideBranding] = useState(
    loaderData.scrape?.widgetConfig?.hideBranding ?? false
  );
  const [previewType, setPreviewType] = useState<"home" | "chat">("home");

  const canHideBranding = useMemo(() => {
    return !!loaderData.scrape?.user?.plan?.brandRemoval?.subscriptionId;
  }, [loaderData.scrape?.user?.plan?.brandRemoval?.subscriptionId]);

  useEffect(() => {
    setQuestions(loaderData.scrape?.widgetConfig?.questions ?? []);
  }, [loaderData.scrape?.widgetConfig?.questions]);

  const liveScrape = useMemo(() => {
    return {
      ...loaderData.scrape!,
      widgetConfig: {
        ...loaderData.scrape?.widgetConfig,
        primaryColor,
        buttonTextColor,
        buttonText,
        tooltip,
        showLogo,
        questions,
        welcomeMessage,
        showMcpSetup,
        textInputPlaceholder,
        logoUrl,
        applyColorsToChatbox,
        title,
        hideBranding,
      },
    };
  }, [
    loaderData.scrape,
    primaryColor,
    buttonTextColor,
    buttonText,
    tooltip,
    showLogo,
    questions,
    welcomeMessage,
    showMcpSetup,
    textInputPlaceholder,
    logoUrl,
    applyColorsToChatbox,
    title,
    hideBranding,
  ]);

  function addQuestion() {
    setQuestions([...questions, { text: "" }]);
  }

  function removeQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index));
  }

  function clearPrimaryColor() {
    setPrimaryColor(null);
  }

  function clearButtonTextColor() {
    setButtonTextColor(null);
  }

  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col gap-4 flex-1">
        <SettingsSection
          id="button-chatbox"
          title="Button & Chatbox"
          description="Customise the Ask AI button and the chatbox appearance"
          fetcher={widgetConfigFetcher}
        >
          <input type="hidden" name="from-widget" value={"true"} />

          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <ColorPicker
                name="primaryColor"
                label="Background"
                color={primaryColor}
                setColor={setPrimaryColor}
                onClear={clearPrimaryColor}
              />

              <ColorPicker
                name="buttonTextColor"
                label="Text color"
                color={buttonTextColor}
                setColor={setButtonTextColor}
                onClear={clearButtonTextColor}
              />
            </div>

            <div className="flex gap-2">
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend">Button text</legend>
                <input
                  className="input w-full"
                  type="text"
                  placeholder="Button text"
                  name="buttonText"
                  value={buttonText ?? ""}
                  onChange={(e) => setButtonText(e.target.value)}
                />
              </fieldset>

              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend">Logo URL</legend>
                <input
                  className="input w-full"
                  type="text"
                  placeholder="Logo URL"
                  name="logoUrl"
                  value={logoUrl ?? ""}
                  onChange={(e) => setLogoUrl(e.target.value)}
                />
              </fieldset>
            </div>

            <fieldset className="fieldset flex-1">
              <legend className="fieldset-legend">Title</legend>
              <input
                className="input w-full"
                type="text"
                placeholder="Ex: Assistant"
                name="title"
                value={title ?? ""}
                onChange={(e) => setTitle(e.target.value)}
              />
            </fieldset>

            <label className="label">
              <input
                type="checkbox"
                className="toggle"
                name="applyColorsToChatbox"
                checked={applyColorsToChatbox}
                onChange={(e) => setApplyColorsToChatbox(e.target.checked)}
              />
              Apply colors to chatbox
            </label>
          </div>
        </SettingsSection>

        <SettingsSection
          id="welcome-message"
          title="Welcome message"
          description="Add your custom welcome message to the widget. Supports markdown."
          fetcher={welcomeMessageFetcher}
        >
          <textarea
            className="textarea textarea-bordered w-full"
            name="welcomeMessage"
            value={welcomeMessage ?? ""}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            placeholder="Hi, I'm the CrawlChat bot. How can I help you today?"
            rows={4}
          />
        </SettingsSection>

        <SettingsSection
          id="example-questions"
          title="Example questions"
          description="Show few example questions when a user visits the widget for the first time"
          fetcher={questionsFetcher}
        >
          <input type="hidden" name="from-questions" value={"true"} />
          {questions.map((question, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                className="input w-full"
                type="text"
                name={"questions"}
                placeholder={"Ex: How to use the product?"}
                value={question.text}
                onChange={(e) => {
                  const newQuestions = [...questions];
                  newQuestions[i].text = e.target.value;
                  setQuestions(newQuestions);
                }}
              />
              <button
                className="btn btn-error btn-soft btn-square"
                type="button"
                onClick={() => removeQuestion(i)}
              >
                <TbTrash />
              </button>
            </div>
          ))}
          <div>
            <button className="btn" type="button" onClick={addQuestion}>
              <TbPlus />
              Add question
            </button>
          </div>
        </SettingsSection>

        <SettingsSection
          id="text-input-placeholder"
          title="Text input placeholder"
          description="Set the placeholder text for the text input field"
          fetcher={textInputPlaceholderFetcher}
        >
          <input
            className="input w-full"
            type="text"
            name="textInputPlaceholder"
            value={textInputPlaceholder ?? ""}
            onChange={(e) => setTextInputPlaceholder(e.target.value)}
            placeholder="Ex: Ask me anything about the product"
          />
        </SettingsSection>

        <SettingsSection
          id="mcp-setup"
          title="MCP setup instructions"
          description="Show the MCP client setup instrctions on the widget"
          fetcher={mcpSetupFetcher}
        >
          <input type="hidden" name="from-mcp-setup" value={"true"} />
          <label className="label">
            <input
              type="checkbox"
              className="toggle"
              name="showMcpSetup"
              checked={showMcpSetup}
              onChange={(e) => setShowMcpSetup(e.target.checked)}
            />
            Show it
          </label>
        </SettingsSection>

        <SettingsSection
          id="hide-branding"
          title="Hide branding"
          description="Hide CrawlChat branding from the widget"
          fetcher={hideBrandingFetcher}
        >
          <input type="hidden" name="from-hide-branding" value={"true"} />
          <label className="label">
            <input
              type="checkbox"
              className="toggle"
              name="hideBranding"
              checked={hideBranding}
              disabled={!canHideBranding}
              onChange={(e) => setHideBranding(e.target.checked)}
            />
            Hide branding
            {!canHideBranding && (
              <span className="text-sm text-base-content/60 ml-2">
                Contact support
              </span>
            )}
          </label>
        </SettingsSection>
      </div>

      <div className="flex flex-col gap-4 w-[500px] sticky top-[80px]">
        <div className="flex justify-center">
          <div>
            <div role="tablist" className="tabs tabs-box shadow-none p-0">
              <a
                role="tab"
                className={cn(
                  "tab gap-2",
                  previewType === "home" && "tab-active"
                )}
                onClick={() => setPreviewType("home")}
              >
                <TbHome /> Home
              </a>
              <a
                role="tab"
                className={cn(
                  "tab gap-2",
                  previewType === "chat" && "tab-active"
                )}
                onClick={() => setPreviewType("chat")}
              >
                <TbMessage /> Chat
              </a>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <AskAIButton
            bg={primaryColor}
            color={buttonTextColor}
            text={buttonText}
          />
        </div>

        <div className="flex flex-col gap-2 rounded-box overflow-hidden w-full pb-8 pt-4">
          <ChatBoxProvider
            key={previewType}
            admin={false}
            readonly={true}
            scrape={liveScrape as Scrape}
            thread={null}
            messages={
              previewType === "home"
                ? []
                : [
                    {
                      ...DEFAULT_MESSAGE,
                      llmMessage: {
                        role: "user",
                        content: "How to embed it?",
                      },
                    },
                    {
                      ...DEFAULT_MESSAGE,
                      llmMessage: {
                        role: "assistant",
                        content: `To embed the AI chatbot on your docs site:

1. Open your CrawlChat dashboard and go to Integrations → Embed.  
2. Customize the widget’s look (colors, text, position).  
3. Copy the generated \`<script>\` snippet.  
4. Paste that snippet into the \`<head>\` section of your site’s pages. !!54660!!`,
                      },
                      links: [
                        {
                          url: "https://crawlchat.app",
                          title: "CrawlChat docs",
                          score: 1,
                          scrapeItemId: "test",
                          knowledgeGroupId: "test",
                          fetchUniqueId: "54660",
                          searchQuery: "test",
                        },
                      ],
                    },
                  ]
            }
            embed={false}
            token={null}
            fullscreen={false}
          >
            <ChatboxContainer noShadow>
              <ChatBox />
            </ChatboxContainer>
          </ChatBoxProvider>
        </div>
      </div>
    </div>
  );
}

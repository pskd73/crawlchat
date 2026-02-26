import type { Route } from "./+types/customise";
import type {
  Message,
  Scrape,
  WidgetConfig,
  WidgetQuestion,
  WidgetSize,
} from "@packages/common/prisma";
import { prisma } from "@packages/common/prisma";
import { getAuthUser } from "~/auth/middleware";
import { SettingsSection } from "~/components/settings-section";
import { useDirtyForm } from "~/components/use-dirty-form";
import { useFetcher } from "react-router";
import {
  authoriseScrapeUser,
  getSessionScrapeId,
} from "../auth/scrape-session";
import { useMemo, useState } from "react";
import { ChatBoxProvider } from "~/widget/use-chat-box";
import ChatBox, { ChatboxContainer } from "~/widget/chat-box";
import {
  TbColorSwatch,
  TbHome,
  TbMessage,
  TbPlus,
  TbTrash,
  TbX,
} from "react-icons/tb";
import cn from "@meltdownjs/cn";
import { makeMeta } from "~/meta";
import { Page } from "~/components/page";

function cleanColor(color: string | null | undefined) {
  return color && ["null", "#abcdef"].includes(color) ? null : color;
}

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
    currentPageContext: null,
    buttonLogoUrl: null,
    chatboxBgColor: null,
    chatboxTextColor: null,
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
    update.primaryColor =
      cleanColor(formData.get("primaryColor") as string) ?? null;
  }
  if (formData.has("buttonText")) {
    update.buttonText = formData.get("buttonText") as string;
  }
  if (formData.has("buttonTextColor")) {
    update.buttonTextColor =
      cleanColor(formData.get("buttonTextColor") as string) ?? null;
  }
  if (formData.has("logoUrl")) {
    update.logoUrl = formData.get("logoUrl") as string;
  }
  if (formData.has("tooltip")) {
    update.tooltip = formData.get("tooltip") as string;
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
  if (formData.has("from-current-page-context")) {
    update.currentPageContext = formData.get("currentPageContext") === "on";
  }
  if (formData.has("chatboxBgColor")) {
    update.chatboxBgColor =
      cleanColor(formData.get("chatboxBgColor") as string) ?? null;
  }
  if (formData.has("chatboxTextColor")) {
    update.chatboxTextColor =
      cleanColor(formData.get("chatboxTextColor") as string) ?? null;
  }
  if (formData.has("buttonLogoUrl")) {
    update.buttonLogoUrl = formData.get("buttonLogoUrl") as string;
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
  url: null,
  answerId: "test",
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  toolCalls: [],
  githubCommentId: null,
  llmCost: 0,
  dataGap: null,
};

function AskAIButton({
  bg,
  color,
  text,
  logoUrl,
}: {
  bg?: string | null;
  color?: string | null;
  text?: string | null;
  logoUrl?: string | null;
}) {
  const square = !!logoUrl;
  return (
    <div
      className={cn("transition-all cursor-pointer hover:scale-105")}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "2px",
        backgroundColor: bg ?? "#7b2cbf",
        color: color ?? "white",
        borderRadius: square ? "8px" : "20px",
        padding: square ? "8px 12px" : "8px 20px",
        boxShadow: "rgba(0, 0, 0, 0.1) 0px 2px 4px",
      }}
    >
      {logoUrl && (
        <img
          src={logoUrl}
          alt="Logo"
          style={{ width: "32px", height: "32px" }}
        />
      )}
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
  const askAIButtonFetcher = useFetcher();
  const chatboxFetcher = useFetcher();
  const sizeFetcher = useFetcher();
  const questionsFetcher = useFetcher();
  const welcomeMessageFetcher = useFetcher();
  const mcpSetupFetcher = useFetcher();
  const textInputPlaceholderFetcher = useFetcher();
  const hideBrandingFetcher = useFetcher();
  const currentPageContextFetcher = useFetcher();

  const config = loaderData.scrape?.widgetConfig;
  const form = useDirtyForm({
    primaryColor: config?.primaryColor ?? null,
    buttonTextColor: config?.buttonTextColor ?? null,
    buttonText: config?.buttonText ?? null,
    buttonLogoUrl: config?.buttonLogoUrl ?? null,
    chatboxBgColor: config?.chatboxBgColor ?? null,
    chatboxTextColor: config?.chatboxTextColor ?? null,
    title: config?.title ?? null,
    logoUrl: config?.logoUrl ?? null,
    size: (config?.size ?? "small") as WidgetSize,
    welcomeMessage: config?.welcomeMessage ?? null,
    questions: config?.questions ?? [],
    textInputPlaceholder: config?.textInputPlaceholder ?? null,
    showMcpSetup: config?.showMcpSetup ?? true,
    currentPageContext: config?.currentPageContext ?? false,
    hideBranding: config?.hideBranding ?? false,
  });

  const [previewType, setPreviewType] = useState<"home" | "chat">("home");

  const canHideBranding = useMemo(() => {
    return !!loaderData.scrape?.user?.plan?.brandRemoval?.subscriptionId;
  }, [loaderData.scrape?.user?.plan?.brandRemoval?.subscriptionId]);

  const liveScrape = useMemo(() => {
    return {
      ...loaderData.scrape!,
      widgetConfig: {
        ...loaderData.scrape?.widgetConfig,
        size: form.getValue("size"),
        primaryColor: form.getValue("primaryColor"),
        buttonTextColor: form.getValue("buttonTextColor"),
        buttonText: form.getValue("buttonText"),
        tooltip: config?.tooltip,
        showLogo: config?.showLogo ?? false,
        questions: form.getValue("questions"),
        welcomeMessage: form.getValue("welcomeMessage"),
        showMcpSetup: form.getValue("showMcpSetup"),
        textInputPlaceholder: form.getValue("textInputPlaceholder"),
        logoUrl: form.getValue("logoUrl"),
        applyColorsToChatbox: config?.applyColorsToChatbox ?? false,
        title: form.getValue("title"),
        hideBranding: form.getValue("hideBranding"),
        currentPageContext: form.getValue("currentPageContext"),
        chatboxBgColor: form.getValue("chatboxBgColor"),
        chatboxTextColor: form.getValue("chatboxTextColor"),
        buttonLogoUrl: form.getValue("buttonLogoUrl"),
      },
    };
  }, [loaderData.scrape, form.values, config]);

  function addQuestion() {
    form.setValue("questions", (prev) => [
      ...((prev ?? []) as WidgetQuestion[]),
      { text: "" },
    ]);
  }

  function removeQuestion(index: number) {
    form.setValue("questions", (prev) => {
      const questions = (prev ?? []) as WidgetQuestion[];
      return questions.filter((_, i) => i !== index);
    });
  }

  const askAiButtonDirty =
    form.isDirty("primaryColor") ||
    form.isDirty("buttonTextColor") ||
    form.isDirty("buttonText") ||
    form.isDirty("buttonLogoUrl");
  const chatboxDirty =
    form.isDirty("chatboxBgColor") ||
    form.isDirty("chatboxTextColor") ||
    form.isDirty("title") ||
    form.isDirty("logoUrl");

  return (
    <Page title={"Customise"} icon={<TbColorSwatch />}>
      <div className="flex items-start gap-4">
        <div className="flex flex-col gap-4 flex-1">
          <SettingsSection
            id="ask-ai-button"
            title="Ask AI button"
            description="Customise the Ask AI button appearance"
            fetcher={askAIButtonFetcher}
            dirty={askAiButtonDirty}
          >
            <input type="hidden" name="from-ask-ai-button" value={"true"} />

            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <ColorPicker
                  name="primaryColor"
                  label="Background"
                  color={form.getValue("primaryColor") as string | null}
                  setColor={(c) => form.setValue("primaryColor", c)}
                  onClear={() => form.setValue("primaryColor", null)}
                />

                <ColorPicker
                  name="buttonTextColor"
                  label="Text color"
                  color={form.getValue("buttonTextColor") as string | null}
                  setColor={(c) => form.setValue("buttonTextColor", c)}
                  onClear={() => form.setValue("buttonTextColor", null)}
                />
              </div>

              <div className="flex gap-2">
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Text</legend>
                  <input
                    className="input w-full"
                    type="text"
                    placeholder="Button text"
                    name="buttonText"
                    value={(form.getValue("buttonText") as string) ?? ""}
                    onChange={form.handleChange("buttonText")}
                  />
                </fieldset>

                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Logo URL</legend>
                  <input
                    className="input w-full"
                    type="text"
                    placeholder="Logo URL"
                    name="buttonLogoUrl"
                    value={(form.getValue("buttonLogoUrl") as string) ?? ""}
                    onChange={form.handleChange("buttonLogoUrl")}
                  />
                </fieldset>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="chatbox"
            title="Chatbox"
            description="Customise the chatbox appearance"
            fetcher={chatboxFetcher}
            dirty={chatboxDirty}
          >
            <input type="hidden" name="from-chatbox" value={"true"} />

            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <ColorPicker
                  name="chatboxBgColor"
                  label="Background"
                  color={form.getValue("chatboxBgColor") as string | null}
                  setColor={(c) => form.setValue("chatboxBgColor", c)}
                  onClear={() => form.setValue("chatboxBgColor", null)}
                />

                <ColorPicker
                  name="chatboxTextColor"
                  label="Text color"
                  color={form.getValue("chatboxTextColor") as string | null}
                  setColor={(c) => form.setValue("chatboxTextColor", c)}
                  onClear={() => form.setValue("chatboxTextColor", null)}
                />
              </div>

              <div className="flex gap-2">
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Title</legend>
                  <input
                    className="input w-full"
                    type="text"
                    placeholder="Ex: Assistant"
                    name="title"
                    value={(form.getValue("title") as string) ?? ""}
                    onChange={form.handleChange("title")}
                  />
                </fieldset>

                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Logo URL</legend>
                  <input
                    className="input w-full"
                    type="text"
                    placeholder="Logo URL"
                    name="logoUrl"
                    value={(form.getValue("logoUrl") as string) ?? ""}
                    onChange={form.handleChange("logoUrl")}
                  />
                </fieldset>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="widget-size"
            title="Widget size"
            description="Set the size of the widget to be when it's embedded on your website"
            fetcher={sizeFetcher}
            dirty={form.isDirty("size")}
          >
            <select
              className="select w-full max-w-xs"
              name="size"
              value={(form.getValue("size") as string) ?? "small"}
              onChange={(e) =>
                form.setValue("size", e.target.value as WidgetSize)
              }
            >
              <option value="small">Small</option>
              <option value="large">Large</option>
            </select>
          </SettingsSection>

          <SettingsSection
            id="welcome-message"
            title="Welcome message"
            description="Add your custom welcome message to the widget. Supports markdown."
            fetcher={welcomeMessageFetcher}
            dirty={form.isDirty("welcomeMessage")}
          >
            <textarea
              className="textarea textarea-bordered w-full"
              name="welcomeMessage"
              value={(form.getValue("welcomeMessage") as string) ?? ""}
              onChange={form.handleChange("welcomeMessage")}
              placeholder="Hi, I'm the CrawlChat bot. How can I help you today?"
              rows={4}
            />
          </SettingsSection>

          <SettingsSection
            id="example-questions"
            title="Example questions"
            description="Show few example questions when a user visits the widget for the first time"
            fetcher={questionsFetcher}
            dirty={form.isDirty("questions")}
          >
            <input type="hidden" name="from-questions" value={"true"} />
            {(form.getValue("questions") as WidgetQuestion[])?.map(
              (question, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    className="input w-full"
                    type="text"
                    name={"questions"}
                    placeholder={"Ex: How to use the product?"}
                    value={question.text}
                    onChange={(e) => {
                      form.setValue("questions", (prev) => {
                        const questions = (prev ?? []) as WidgetQuestion[];
                        const next = [...questions];
                        next[i] = { ...next[i], text: e.target.value };
                        return next;
                      });
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
              )
            )}
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
            dirty={form.isDirty("textInputPlaceholder")}
          >
            <input
              className="input w-full"
              type="text"
              name="textInputPlaceholder"
              value={(form.getValue("textInputPlaceholder") as string) ?? ""}
              onChange={form.handleChange("textInputPlaceholder")}
              placeholder="Ex: Ask me anything about the product"
            />
          </SettingsSection>

          <SettingsSection
            id="mcp-setup"
            title="MCP setup instructions"
            description="Show the MCP client setup instrctions on the widget"
            fetcher={mcpSetupFetcher}
            dirty={form.isDirty("showMcpSetup")}
          >
            <input type="hidden" name="from-mcp-setup" value={"true"} />
            <label className="label">
              <input
                type="checkbox"
                className="toggle"
                name="showMcpSetup"
                checked={(form.getValue("showMcpSetup") as boolean) ?? true}
                onChange={form.handleChange("showMcpSetup")}
              />
              Show it
            </label>
          </SettingsSection>

          <SettingsSection
            id="current-page-context"
            title="Current page context"
            description="Include the current page in the context of the conversation"
            fetcher={currentPageContextFetcher}
            dirty={form.isDirty("currentPageContext")}
          >
            <input
              type="hidden"
              name="from-current-page-context"
              value={"true"}
            />
            <label className="label">
              <input
                type="checkbox"
                className="toggle"
                name="currentPageContext"
                checked={
                  (form.getValue("currentPageContext") as boolean) ?? false
                }
                onChange={form.handleChange("currentPageContext")}
              />
              Enable
            </label>
          </SettingsSection>

          <SettingsSection
            id="hide-branding"
            title="Hide branding"
            description="Hide CrawlChat branding from the widget"
            fetcher={hideBrandingFetcher}
            dirty={form.isDirty("hideBranding")}
          >
            <input type="hidden" name="from-hide-branding" value={"true"} />
            <label className="label">
              <input
                type="checkbox"
                className="toggle"
                name="hideBranding"
                checked={(form.getValue("hideBranding") as boolean) ?? false}
                disabled={!canHideBranding}
                onChange={form.handleChange("hideBranding")}
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

        <div
          className={cn(
            "flex flex-col gap-4 w-[500px] sticky top-[76px]",
            "bg-base-100/80 p-4 border-base-300 border rounded-box",
            "customise-preview shadow"
          )}
        >
          <div className="flex justify-center">
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

          <div className="flex justify-center">
            <AskAIButton
              logoUrl={form.getValue("buttonLogoUrl") as string | null}
              bg={form.getValue("primaryColor") as string | null}
              color={form.getValue("buttonTextColor") as string | null}
              text={form.getValue("buttonText") as string | null}
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
                            searchType: "test",
                            cited: true,
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
    </Page>
  );
}

import {
  Box,
  Button,
  Center,
  Code,
  Group,
  HStack,
  IconButton,
  Input,
  parseColor,
  Stack,
  Textarea,
} from "@chakra-ui/react";
import { prisma } from "~/prisma";
import { getAuthUser } from "~/auth/middleware";
import { SettingsSection } from "~/settings-section";
import { useFetcher } from "react-router";
import type {
  Scrape,
  WidgetConfig,
  WidgetQuestion,
  WidgetSize,
} from "libs/prisma";
import {
  ColorPickerArea,
  ColorPickerContent,
  ColorPickerControl,
  ColorPickerEyeDropper,
  ColorPickerInput,
  ColorPickerLabel,
  ColorPickerRoot,
  ColorPickerSliders,
  ColorPickerTrigger,
} from "~/components/ui/color-picker";
import { Field } from "~/components/ui/field";
import type { Route } from "./+types/embed";
import { authoriseScrapeUser, getSessionScrapeId } from "../scrapes/util";
import { Switch } from "~/components/ui/switch";
import { useEffect, useMemo, useState } from "react";
import { ChatBoxProvider } from "~/widget/use-chat-box";
import ChatBox, { ChatboxContainer } from "~/widget/chat-box";
import { TbHome, TbMessage, TbPlus, TbTrash, TbX } from "react-icons/tb";
import { SegmentedControl } from "~/components/ui/segmented-control";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const scrape = await prisma.scrape.findUnique({
    where: {
      id: scrapeId,
    },
  });

  return { scrape };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const scrape = await prisma.scrape.findUnique({
    where: {
      id: scrapeId,
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
    private: false,
    logoUrl: null,
    applyColorsToChatbox: null,
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
    update.primaryColor =
      update.primaryColor === "null" ? null : update.primaryColor;
  }
  if (formData.has("buttonText")) {
    update.buttonText = formData.get("buttonText") as string;
  }
  if (formData.has("buttonTextColor")) {
    update.buttonTextColor = formData.get("buttonTextColor") as string;
    update.buttonTextColor =
      update.buttonTextColor === "null" ? null : update.buttonTextColor;
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
  if (formData.has("from-private")) {
    update.private = formData.get("private") === "on";
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

const DEFAULT_MESSAGE = {
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
    <Box
      bg={bg ?? "#7b2cbf"}
      color={color ?? "white"}
      p={"8px 20px"}
      rounded={"20px"}
      w={"fit-content"}
      transition={"scale 0.1s ease"}
      cursor={"pointer"}
      _hover={{
        scale: 1.05,
      }}
    >
      {text ?? "Ask AI"}
    </Box>
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
    <Group alignItems={"flex-end"} flex={1}>
      <ColorPickerRoot
        flex={1}
        name={color ? name : undefined}
        value={color ? parseColor(color) : undefined}
        onValueChange={(e) => setColor(e.valueAsString)}
      >
        <ColorPickerLabel>{label}</ColorPickerLabel>
        <ColorPickerControl>
          <ColorPickerInput />
          <ColorPickerTrigger />
        </ColorPickerControl>
        <ColorPickerContent>
          <ColorPickerArea />
          <HStack>
            <ColorPickerEyeDropper />
            <ColorPickerSliders />
          </HStack>
        </ColorPickerContent>
      </ColorPickerRoot>
      <IconButton variant={"subtle"} onClick={onClear}>
        <TbX />
      </IconButton>
    </Group>
  );
}

export default function ScrapeCustomise({ loaderData }: Route.ComponentProps) {
  const widgetConfigFetcher = useFetcher();
  const questionsFetcher = useFetcher();
  const welcomeMessageFetcher = useFetcher();
  const mcpSetupFetcher = useFetcher();
  const textInputPlaceholderFetcher = useFetcher();
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
    loaderData.scrape?.widgetConfig?.showMcpSetup ?? false
  );
  const [textInputPlaceholder, setTextInputPlaceholder] = useState(
    loaderData.scrape?.widgetConfig?.textInputPlaceholder
  );
  const [previewType, setPreviewType] = useState<"home" | "chat">("home");

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
  ]);

  function addQuestion() {
    setQuestions([...questions, { text: "" }]);
  }

  function removeQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index));
  }

  function clearPrimaryColor() {
    setPrimaryColor(null);
    widgetConfigFetcher.submit(
      {
        primaryColor: null,
      },
      {
        method: "post",
      }
    );
  }

  function clearButtonTextColor() {
    setButtonTextColor(null);
    widgetConfigFetcher.submit(
      {
        buttonTextColor: null,
      },
      {
        method: "post",
      }
    );
  }

  return (
    <Group alignItems={"flex-start"} gap={4}>
      <Stack flex={1} gap={4}>
        <SettingsSection
          id="button-chatbox"
          title="Button & Chatbox"
          description="Configure the widget and copy paste the <script> tag below to your website."
          fetcher={widgetConfigFetcher}
        >
          <input type="hidden" name="from-widget" value={"true"} />

          <Stack flex={1}>
            <Stack gap={4}>
              <Group>
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
              </Group>

              <Group>
                <Field label="Button text">
                  <Input
                    placeholder="Button text"
                    name="buttonText"
                    value={buttonText ?? ""}
                    onChange={(e) => setButtonText(e.target.value)}
                  />
                </Field>
              </Group>

              {/* <Group>
                <Field label="Tooltip">
                  <Input
                    placeholder="Ex: Ask AI or reach out to us!"
                    name="tooltip"
                    value={tooltip ?? ""}
                    onChange={(e) => setTooltip(e.target.value)}
                  />
                </Field>
              </Group> */}

              <Group>
                <Field label="Logo URL">
                  <Input
                    placeholder="Ex: https://example.com/logo.png"
                    name="logoUrl"
                    value={logoUrl ?? ""}
                    onChange={(e) => setLogoUrl(e.target.value)}
                  />
                </Field>
              </Group>

              {/* <Group>
                <Switch
                  name="showLogo"
                  checked={showLogo}
                  onCheckedChange={(e) => setShowLogo(e.checked)}
                >
                  Show logo on Ask AI button
                </Switch>
              </Group> */}
            </Stack>
          </Stack>
        </SettingsSection>

        <SettingsSection
          id="welcome-message"
          title="Welcome message"
          description="Add your custom welcome message to the widget. Supports markdown."
          fetcher={welcomeMessageFetcher}
        >
          <Textarea
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
            <Group key={i}>
              <Input
                name={"questions"}
                placeholder={"Ex: How to use the product?"}
                value={question.text}
                onChange={(e) => {
                  const newQuestions = [...questions];
                  newQuestions[i].text = e.target.value;
                  setQuestions(newQuestions);
                }}
              />
              <IconButton
                variant={"subtle"}
                onClick={() => removeQuestion(i)}
                colorPalette={"red"}
              >
                <TbTrash />
              </IconButton>
            </Group>
          ))}
          <Box>
            <Button size="sm" variant={"subtle"} onClick={addQuestion}>
              <TbPlus />
              Add question
            </Button>
          </Box>
        </SettingsSection>

        <SettingsSection
          id="text-input-placeholder"
          title="Text input placeholder"
          description="Set the placeholder text for the text input field"
          fetcher={textInputPlaceholderFetcher}
        >
          <Input
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
          <Switch
            name="showMcpSetup"
            checked={showMcpSetup}
            onCheckedChange={(e) => setShowMcpSetup(e.checked)}
          >
            Show it
          </Switch>
        </SettingsSection>
      </Stack>
      <Stack flex={1} position={"sticky"} top={"80px"} gap={4}>
        <Center>
          <Box>
            <SegmentedControl
              value={previewType}
              onValueChange={(e) => setPreviewType(e.value as "home" | "chat")}
              items={[
                {
                  value: "home",
                  label: (
                    <HStack>
                      <TbHome />
                      Home
                    </HStack>
                  ),
                },
                {
                  value: "chat",
                  label: (
                    <HStack>
                      <TbMessage />
                      Chat
                    </HStack>
                  ),
                },
              ]}
            />
          </Box>
        </Center>
        <Center>
          <AskAIButton
            bg={primaryColor}
            color={buttonTextColor}
            text={buttonText}
          />
        </Center>
        <Stack rounded={"md"} overflow={"hidden"} w={"full"} pb={8} pt={4}>
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
                          url: "https://crawlchat.com",
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
            <ChatboxContainer>
              <ChatBox />
            </ChatboxContainer>
          </ChatBoxProvider>
        </Stack>
      </Stack>
    </Group>
  );
}

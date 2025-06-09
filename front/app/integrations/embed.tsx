import {
  Box,
  Code,
  createListCollection,
  Group,
  HStack,
  IconButton,
  Input,
  NativeSelect,
  parseColor,
  SegmentGroup,
  Slider,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { prisma } from "~/prisma";
import { getAuthUser } from "~/auth/middleware";
import { SettingsContainer, SettingsSection, SettingsSectionProvider } from "~/settings-section";
import { useFetcher } from "react-router";
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "~/components/ui/select";
import type { WidgetConfig, WidgetQuestion, WidgetSize } from "libs/prisma";
import { Button } from "~/components/ui/button";
import { TbCode, TbEye, TbCopy, TbPlus, TbTrash } from "react-icons/tb";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { ClipboardIconButton, ClipboardRoot } from "~/components/ui/clipboard";
import type { Route } from "./+types/embed";
import { getSessionScrapeId } from "../scrapes/util";
import { Switch } from "~/components/ui/switch";
import { toaster } from "~/components/ui/toaster";
import { SiDocusaurus } from "react-icons/si";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);

  const scrape = await prisma.scrape.findUnique({
    where: {
      id: scrapeId,
      userId: user!.id,
    },
  });

  return { scrape };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);

  const scrape = await prisma.scrape.findUnique({
    where: {
      id: scrapeId,
      userId: user!.id,
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

const sizes = createListCollection({
  items: [
    { label: "Small", value: "small" },
    { label: "Large", value: "large" },
    { label: "Full Screen", value: "full_screen" },
  ],
});

type EmbedProps = {
  button?: boolean;
  text?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonText?: string;
  position?: string;
  radius: number;
};

function makeScriptCode(props: EmbedProps, scrapeId: string) {
  if (typeof window === "undefined") {
    return { script: "", docusaurusConfig: "" };
  }

  const origin = window.location.origin;

  const attributes: Record<string, string> = {};
  const {
    button,
    text,
    buttonColor,
    buttonTextColor,
    buttonText,
    position,
    radius,
  } = props;

  if (text) {
    attributes["data-ask-ai-text"] = text;
  }

  if (button) {
    attributes["data-ask-ai"] = "true";
  }

  if (buttonColor) {
    attributes["data-ask-ai-background-color"] = buttonColor;
  }

  if (buttonTextColor) {
    attributes["data-ask-ai-color"] = buttonTextColor;
  }

  if (buttonText) {
    attributes["data-ask-ai-text"] = buttonText;
  }

  if (position) {
    attributes["data-ask-ai-position"] = position;
  }

  if (radius) {
    attributes["data-ask-ai-radius"] = `${radius}px`;
  }

  const script = `<script 
  src="${origin}/embed.js" 
  id="crawlchat-script" 
  data-id="${scrapeId}" 
  ${Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join("\n  ")}
></script>`;

  const docusaurusConfig = `headTags: [
  {
      "tagName": "script",
      "attributes": {
        "src": "${origin}/embed.js",
        "id": "crawlchat-script",
        "data-id": "${scrapeId}",
        ${Object.entries(attributes)
          .map(([key, value]) => `"${key}": "${value}"`)
          .join(",\n        ")}
      },
    },
],`;

  return { script, docusaurusConfig };
}

function PreviewEmbed({ scriptCode }: { scriptCode: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current || !iframeRef.current.contentDocument) return;

    iframeRef.current.contentDocument.open();
    iframeRef.current.contentDocument.close();

    iframeRef.current.contentDocument.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CrawlChat</title>
          <style>
            body {
              font-family: 'Inter', sans-serif;
            }
          </style>
        </head>
        <body>
          ${scriptCode}
        </body>
      </html>`);
  }, [scriptCode]);

  return (
    <iframe ref={iframeRef} id="crawlchat-script" style={{ height: "100%" }} />
  );
}

const widgetConfigTabs = createListCollection({
  items: [
    { label: "Preview", value: "preview", icon: <TbEye /> },
    { label: "Code", value: "code", icon: <TbCode /> },
    { label: "Docusaurus", value: "docusaurus", icon: <SiDocusaurus /> },
  ],
});

export default function ScrapeEmbed({ loaderData }: Route.ComponentProps) {
  const sizeFetcher = useFetcher();
  const questionsFetcher = useFetcher();
  const welcomeMessageFetcher = useFetcher();
  const mcpSetupFetcher = useFetcher();
  const textInputPlaceholderFetcher = useFetcher();
  const [embedProps, setEmbedProps] = useState<EmbedProps>({
    button: true,
    buttonColor: "#7b2cbf",
    buttonTextColor: "#ffffff",
    buttonText: "💬 Ask AI",
    position: "br",
    radius: 20,
  });
  const [tab, setTab] = useState<"preview" | "code" | "docusaurus">("preview");
  const scriptCode = useMemo(
    () => makeScriptCode(embedProps, loaderData.scrape?.id ?? ""),
    [embedProps, loaderData.scrape?.id]
  );

  const [questions, setQuestions] = useState<WidgetQuestion[]>(
    loaderData.scrape?.widgetConfig?.questions ?? []
  );

  useEffect(() => {
    setQuestions(loaderData.scrape?.widgetConfig?.questions ?? []);
  }, [loaderData.scrape?.widgetConfig?.questions]);

  function addQuestion() {
    setQuestions([...questions, { text: "" }]);
  }

  function removeQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index));
  }

  function copyCode() {
    if (tab === "code") {
      navigator.clipboard.writeText(scriptCode.script);
    } else if (tab === "docusaurus") {
      navigator.clipboard.writeText(scriptCode.docusaurusConfig);
    }
    toaster.success({
      title: "Copied to clipboard",
    });
  }

  return (
    <SettingsSectionProvider>
      <SettingsContainer>
        <SettingsSection
          id="customise-widget"
          title="Customise widget"
          description="Configure the widget and copy paste the <script> tag below to your website."
          actionRight={
            <Button size={"xs"} onClick={copyCode}>
              Copy code
              <TbCopy />
            </Button>
          }
        >
          <Group alignItems={"flex-start"} gap={10}>
            <Stack flex={1}>
              <Stack gap={6}>
                <Group>
                  <ColorPickerRoot
                    flex={1}
                    value={parseColor(embedProps.buttonColor ?? "")}
                    onValueChange={(e) =>
                      setEmbedProps({
                        ...embedProps,
                        buttonColor: e.valueAsString,
                      })
                    }
                  >
                    <ColorPickerLabel>Button color</ColorPickerLabel>
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

                  <ColorPickerRoot
                    flex={1}
                    value={parseColor(embedProps.buttonTextColor ?? "")}
                    onValueChange={(e) =>
                      setEmbedProps({
                        ...embedProps,
                        buttonTextColor: e.valueAsString,
                      })
                    }
                  >
                    <ColorPickerLabel>Button text color</ColorPickerLabel>
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
                </Group>

                <Group>
                  <Field label="Button text">
                    <Input
                      placeholder="Button text"
                      value={embedProps.buttonText}
                      onChange={(e) =>
                        setEmbedProps({
                          ...embedProps,
                          buttonText: e.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Position">
                    <NativeSelect.Root width="100%">
                      <NativeSelect.Field
                        value={embedProps.position}
                        onChange={(e) =>
                          setEmbedProps({
                            ...embedProps,
                            position: e.target.value,
                          })
                        }
                      >
                        <option value="br">Bottom right</option>
                        <option value="bl">Bottom left</option>
                        <option value="tr">Top right</option>
                        <option value="tl">Top left</option>
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field>
                </Group>

                <Group>
                  <Slider.Root
                    flex={1}
                    value={[embedProps.radius]}
                    min={0}
                    max={25}
                    step={1}
                    onValueChange={(e) =>
                      setEmbedProps({ ...embedProps, radius: e.value[0] })
                    }
                  >
                    <Slider.Label>Roundness</Slider.Label>
                    <Slider.Control>
                      <Slider.Track>
                        <Slider.Range />
                      </Slider.Track>
                      <Slider.Thumb index={0} />
                    </Slider.Control>
                  </Slider.Root>
                  <Box flex={1} />
                </Group>
              </Stack>
            </Stack>

            <Stack flex={1}>
              <Box>
                <SegmentGroup.Root
                  value={tab}
                  onValueChange={(e) =>
                    setTab(e.value as "preview" | "code" | "docusaurus")
                  }
                >
                  <SegmentGroup.Indicator />
                  {widgetConfigTabs.items.map((item) => (
                    <SegmentGroup.Item key={item.value} value={item.value}>
                      <SegmentGroup.ItemText>
                        <HStack>
                          {item.icon}
                          {item.label}
                        </HStack>
                      </SegmentGroup.ItemText>
                      <SegmentGroup.ItemHiddenInput />
                    </SegmentGroup.Item>
                  ))}
                </SegmentGroup.Root>
              </Box>
              {tab === "preview" && (
                <Stack
                  flex={1}
                  bg="brand.outline-subtle"
                  p={2}
                  rounded={"md"}
                  overflow={"hidden"}
                  alignSelf={"stretch"}
                >
                  <PreviewEmbed
                    key={JSON.stringify(embedProps)}
                    scriptCode={scriptCode.script}
                  />
                </Stack>
              )}

              {tab === "code" && (
                <Stack>
                  <Stack
                    flex={1}
                    border={"1px solid"}
                    borderColor="brand.outline"
                    rounded={"md"}
                    alignSelf={"stretch"}
                  >
                    <Stack
                      p={4}
                      h="full"
                      alignItems={"flex-start"}
                      flexDir={"column"}
                    >
                      <Text fontSize={"sm"} flex={1} whiteSpace={"pre-wrap"}>
                        {scriptCode.script}
                      </Text>

                      <Group justifyContent={"flex-end"} w="full">
                        <ClipboardRoot value={scriptCode.script}>
                          <ClipboardIconButton />
                        </ClipboardRoot>
                      </Group>
                    </Stack>
                  </Stack>
                  <Text fontSize={"sm"}>
                    Copy and paste the above code inside the{" "}
                    <Code>&lt;head&gt;</Code> tag of your website to embed the
                    widget.
                  </Text>
                </Stack>
              )}

              {tab === "docusaurus" && (
                <Stack>
                  <Stack
                    flex={1}
                    border={"1px solid"}
                    borderColor="brand.outline"
                    rounded={"md"}
                    alignSelf={"stretch"}
                  >
                    <Stack
                      p={4}
                      h="full"
                      alignItems={"flex-start"}
                      flexDir={"column"}
                    >
                      <Text fontSize={"sm"} flex={1} whiteSpace={"pre-wrap"}>
                        {scriptCode.docusaurusConfig}
                      </Text>

                      <Group justifyContent={"flex-end"} w="full">
                        <ClipboardRoot value={scriptCode.docusaurusConfig}>
                          <ClipboardIconButton />
                        </ClipboardRoot>
                      </Group>
                    </Stack>
                  </Stack>
                  <Text fontSize={"sm"}>
                    Copy and paste the above config inside your{" "}
                    <Code>docusaurus.config.js</Code> file to embed the widget.
                  </Text>
                </Stack>
              )}
            </Stack>
          </Group>
        </SettingsSection>

        <SettingsSection
          id="widget-size"
          title="Widget size"
          description="Set the size of the widget to be when it's embedded on your website"
          fetcher={sizeFetcher}
        >
          <SelectRoot
            collection={sizes}
            maxW="320px"
            name="size"
            defaultValue={[loaderData.scrape?.widgetConfig?.size ?? "small"]}
          >
            <SelectTrigger>
              <SelectValueText placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {sizes.items.map((size) => (
                <SelectItem item={size} key={size.value}>
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectRoot>
        </SettingsSection>

        <SettingsSection
          id="welcome-message"
          title="Welcome message"
          description="Add your custom welcome message to the widget. Supports markdown."
          fetcher={welcomeMessageFetcher}
        >
          <Textarea
            name="welcomeMessage"
            defaultValue={loaderData.scrape?.widgetConfig?.welcomeMessage ?? ""}
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
                defaultValue={question.text}
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
            defaultValue={
              loaderData.scrape?.widgetConfig?.textInputPlaceholder ?? ""
            }
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
            defaultChecked={
              loaderData.scrape?.widgetConfig?.showMcpSetup ?? true
            }
          >
            Show it
          </Switch>
        </SettingsSection>
      </SettingsContainer>
    </SettingsSectionProvider>
  );
}

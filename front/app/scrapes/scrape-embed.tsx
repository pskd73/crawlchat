import {
  Box,
  Clipboard,
  Code,
  createListCollection,
  Group,
  Heading,
  HStack,
  IconButton,
  Input,
  NativeSelect,
  parseColor,
  Slider,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { prisma } from "~/prisma";
import type { Route } from "./+types/scrape-embed";
import { getAuthUser } from "~/auth/middleware";
import { SettingsSection } from "~/dashboard/settings";
import { useFetcher } from "react-router";
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "~/components/ui/select";
import type {
  Prisma,
  WidgetConfig,
  WidgetQuestion,
  WidgetSize,
} from "libs/prisma";
import { Button } from "~/components/ui/button";
import { TbPlus, TbSettings, TbSettings2, TbTrash } from "react-icons/tb";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccordionItem,
  AccordionItemContent,
  AccordionItemTrigger,
  AccordionRoot,
} from "~/components/ui/accordion";
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

export async function loader({ params, request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrape = await prisma.scrape.findUnique({
    where: {
      id: params.id,
      userId: user!.id,
    },
  });

  return { scrape };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrape = await prisma.scrape.findUnique({
    where: {
      id: params.id,
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
    return "";
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

  return `<script src="${origin}/embed.js" 
  id="crawlchat-script" 
  data-id="${scrapeId}" 
  ${Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ")}
></script>`;
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
          <div>
            Preview
          </div>
          ${scriptCode}
        </body>
      </html>`);
  }, [scriptCode]);

  return (
    <iframe ref={iframeRef} id="crawlchat-script" style={{ height: "100%" }} />
  );
}

export default function ScrapeEmbed({ loaderData }: Route.ComponentProps) {
  const sizeFetcher = useFetcher();
  const questionsFetcher = useFetcher();
  const welcomeMessageFetcher = useFetcher();
  const [embedProps, setEmbedProps] = useState<EmbedProps>({
    button: true,
    buttonColor: "#7b2cbf",
    buttonTextColor: "#ffffff",
    buttonText: "💬 Ask AI",
    position: "br",
    radius: 20,
  });
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

  return (
    <Stack gap={6}>
      <Text>
        Configure the widget and copy paste the <Code>&lt;script&gt;</Code> tag
        below to your website.
      </Text>

      <Group alignItems={"flex-start"}>
        <Stack flex={2}>
          <AccordionRoot defaultValue={["basic"]} variant={"enclosed"}>
            <AccordionItem value={"basic"}>
              <AccordionItemTrigger>
                <TbSettings />
                Basic
              </AccordionItemTrigger>
              <AccordionItemContent>
                <Stack gap={6}>
                  {/* <Switch
                    checked={embedProps.button}
                    onCheckedChange={(e) =>
                      setEmbedProps({ ...embedProps, button: e.checked })
                    }
                  >
                    Ask AI button
                  </Switch> */}

                  <ColorPickerRoot
                    maxW="200px"
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
                    maxW="200px"
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
                </Stack>
              </AccordionItemContent>
            </AccordionItem>
            <AccordionItem value={"advanced"}>
              <AccordionItemTrigger>
                <TbSettings2 />
                Advanced
              </AccordionItemTrigger>
              <AccordionItemContent>
                <Stack gap={4}>
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

                  <Slider.Root
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
                </Stack>
              </AccordionItemContent>
            </AccordionItem>
          </AccordionRoot>
        </Stack>

        <Stack
          flex={1}
          bg="brand.outline-subtle"
          p={4}
          rounded={"md"}
          overflow={"hidden"}
          alignSelf={"stretch"}
        >
          <PreviewEmbed
            key={JSON.stringify(embedProps)}
            scriptCode={scriptCode}
          />
        </Stack>

        <Stack
          flex={1}
          border={"1px solid"}
          borderColor="brand.outline"
          rounded={"md"}
          alignSelf={"stretch"}
        >
          <Stack p={4} h="full" alignItems={"flex-start"} flexDir={"column"}>
            <Text fontSize={"sm"} flex={1}>
              {scriptCode}
            </Text>

            <Group justifyContent={"flex-end"} w="full">
              <ClipboardRoot value={scriptCode}>
                <ClipboardIconButton />
              </ClipboardRoot>
            </Group>
          </Stack>
        </Stack>
      </Group>

      <Stack gap={4}>
        <SettingsSection
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
          title="Welcome message"
          description="Add your custom welcome message to the widget. Supports markdown."
          fetcher={welcomeMessageFetcher}
        >
          <Textarea
            name="welcomeMessage"
            defaultValue={loaderData.scrape?.widgetConfig?.welcomeMessage ?? ""}
            placeholder="Hi, I'm the CrawlChat bot. How can I help you today?"
            rows={8}
          />
        </SettingsSection>

        <SettingsSection
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
      </Stack>
    </Stack>
  );
}

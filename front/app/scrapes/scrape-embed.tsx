import {
  Box,
  Code,
  createListCollection,
  Group,
  Heading,
  IconButton,
  Input,
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
import { TbPlus, TbTrash } from "react-icons/tb";
import { useEffect, useState } from "react";
import { InputGroup } from "~/components/ui/input-group";

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

export default function ScrapeEmbed({ loaderData }: Route.ComponentProps) {
  const sizeFetcher = useFetcher();
  const questionsFetcher = useFetcher();
  const welcomeMessageFetcher = useFetcher();

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
      <Stack>
        <Heading>1. Script</Heading>
        <Text>
          First step in embedding the chat widget on your website is to add the{" "}
          <Code>script</Code> to your page. Add the following script to the{" "}
          <Code>head</Code> tag of your page.
        </Text>
        <pre>
          <Code
            as="pre"
            whiteSpace="pre-wrap"
            wordBreak="break-word"
            overflowX="auto"
            p={4}
          >{`<script src="https://crawlchat.app/embed.js" id="crawlchat-script" data-id="${loaderData.scrape?.id}"></script>`}</Code>
        </pre>
      </Stack>

      <Stack>
        <Heading>2. Show & Hide</Heading>
        <Text>
          To show and hide the chat widget, you can use the following code:
        </Text>
        <pre>
          <Code>{`window.crawlchatEmbed.show();`}</Code>
        </pre>
        <pre>
          <Code>{`window.crawlchatEmbed.hide();`}</Code>
        </pre>
      </Stack>

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
            <Group>
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

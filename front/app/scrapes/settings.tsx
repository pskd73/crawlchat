import {
  Alert,
  createListCollection,
  DataList,
  Group,
  Heading,
  Input,
  Portal,
  Select,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { redirect, useFetcher } from "react-router";
import { SettingsSection } from "~/dashboard/profile";
import { prisma } from "~/prisma";
import type { Route } from "./+types/settings";
import { getAuthUser } from "~/auth/middleware";
import type { LlmModel, Prisma } from "libs/prisma";
import { getSession } from "~/session";
import { TbSettings, TbTrash } from "react-icons/tb";
import { Page } from "~/components/page";
import moment from "moment";
import { Button } from "~/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { getSessionScrapeId } from "./util";
import { createToken } from "~/jwt";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  const session = await getSession(request.headers.get("cookie"));
  const scrapeId = session.get("scrapeId");

  if (!scrapeId) {
    throw redirect("/app");
  }

  const scrape = await prisma.scrape.findUnique({
    where: { id: scrapeId, userId: user!.id },
  });

  if (!scrape) {
    throw new Response("Not found", { status: 404 });
  }

  return { scrape };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const formData = await request.formData();

  const scrapeId = await getSessionScrapeId(request);

  if (request.method === "DELETE") {
    await fetch(`${process.env.VITE_SERVER_URL}/scrape`, {
      method: "DELETE",
      body: JSON.stringify({ scrapeId }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${createToken(user!.id)}`,
      },
    });
    await prisma.scrape.delete({
      where: { id: scrapeId },
    });
    throw redirect("/app");
  }

  const chatPrompt = formData.get("chatPrompt") as string | null;
  const title = formData.get("title") as string | null;

  const update: Prisma.ScrapeUpdateInput = {};
  if (chatPrompt) {
    update.chatPrompt = chatPrompt;
  }
  if (title) {
    update.title = title;
  }
  if (formData.has("llmModel")) {
    update.llmModel = formData.get("llmModel") as LlmModel;
  }

  const scrape = await prisma.scrape.update({
    where: { id: scrapeId, userId: user!.id },
    data: update,
  });

  return { scrape };
}

export default function ScrapeSettings({ loaderData }: Route.ComponentProps) {
  const promptFetcher = useFetcher();
  const nameFetcher = useFetcher();
  const deleteFetcher = useFetcher();
  const modelFetcher = useFetcher();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [selectedModel, setSelectedModel] = useState<LlmModel>(
    loaderData.scrape.llmModel ?? "gpt_4o_mini"
  );
  const models = useMemo(() => {
    return createListCollection({
      items: [
        { label: "GPT-4o-mini", value: "gpt_4o_mini" },
        // { label: "o3-mini", value: "o3_mini" },
        { label: "Sonnet-3.5", value: "sonnet_3_5" },
      ],
    });
  }, []);

  useEffect(() => {
    if (deleteConfirm) {
      setTimeout(() => {
        setDeleteConfirm(false);
      }, 5000);
    }
  }, [deleteConfirm]);

  function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    deleteFetcher.submit(null, {
      method: "delete",
    });
  }

  return (
    <Page title="Settings" icon={<TbSettings />}>
      <Stack gap={4}>
        <DataList.Root orientation={"horizontal"}>
          <DataList.Item>
            <DataList.ItemLabel>Created</DataList.ItemLabel>
            <DataList.ItemValue>
              {moment(loaderData.scrape.createdAt).fromNow()}
            </DataList.ItemValue>
          </DataList.Item>
          <DataList.Item>
            <DataList.ItemLabel>Id</DataList.ItemLabel>
            <DataList.ItemValue>{loaderData.scrape.id}</DataList.ItemValue>
          </DataList.Item>
        </DataList.Root>

        <SettingsSection
          title="Name"
          description="Give it a name. It will be shown on chat screen."
          fetcher={nameFetcher}
        >
          <Input
            name="title"
            defaultValue={loaderData.scrape.title ?? ""}
            placeholder="Enter a name for this scrape."
          />
        </SettingsSection>

        <SettingsSection
          title="Chat Prompt"
          description="Customize the chat prompt for this scrape."
          fetcher={promptFetcher}
        >
          <Textarea
            name="chatPrompt"
            defaultValue={loaderData.scrape.chatPrompt ?? ""}
            placeholder="Enter a custom chat prompt for this scrape."
          />
        </SettingsSection>

        <SettingsSection
          title="AI Model"
          description="Select the AI model to use for the messages across channels."
          fetcher={modelFetcher}
        >
          <Stack>
            <Select.Root
              name="llmModel"
              collection={models}
              maxW="400px"
              positioning={{ sameWidth: true }}
              defaultValue={[loaderData.scrape.llmModel ?? "gpt_4o_mini"]}
              onValueChange={(e) => setSelectedModel(e.value[0] as LlmModel)}
            >
              <Select.HiddenSelect />
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder="Select framework" />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content>
                    {models.items.map((model) => (
                      <Select.Item item={model} key={model.value}>
                        {model.label}
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
            {selectedModel.startsWith("sonnet") && (
              <Alert.Root status="info" title="Alert" maxW="400px">
                <Alert.Indicator />
                <Alert.Title>
                  <Text>
                    <Text as={"span"} fontWeight={"bolder"}>
                      {selectedModel}
                    </Text>{" "}
                    is the best performing model available and it consumes{" "}
                    <Text as="span" fontWeight={"bolder"}>
                      4 message credits
                    </Text>
                    .
                  </Text>
                </Alert.Title>
              </Alert.Root>
            )}
          </Stack>
        </SettingsSection>

        <Stack
          border={"1px solid"}
          borderColor={"red.300"}
          bg="red.50"
          rounded={"lg"}
          p={4}
          gap={4}
        >
          <Stack>
            <Heading>Delete collection</Heading>
            <Text fontSize={"sm"} opacity={0.5}>
              This will delete the collection and all the messages, knowledge
              base, and the other data that is associated with it. This is not
              reversible.
            </Text>
          </Stack>
          <Group>
            <Button
              colorPalette={"red"}
              onClick={handleDelete}
              loading={deleteFetcher.state !== "idle"}
              variant={deleteConfirm ? "solid" : "outline"}
            >
              {deleteConfirm ? "Sure to delete?" : "Delete"}
              <TbTrash />
            </Button>
          </Group>
        </Stack>
      </Stack>
    </Page>
  );
}

import {
  Alert,
  Center,
  createListCollection,
  DataList,
  Group,
  Heading,
  Image,
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
import { TbPhoto, TbSettings, TbTrash } from "react-icons/tb";
import { Page } from "~/components/page";
import moment from "moment";
import { Button } from "~/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { getSessionScrapeId } from "./util";
import { createToken } from "~/jwt";
import { Switch } from "~/components/ui/switch";

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
  if (formData.has("logoUrl")) {
    update.logoUrl = formData.get("logoUrl") as string;
  }
  if (formData.has("from-ticketing-enabled")) {
    update.ticketingEnabled = formData.get("ticketing") === "on";
  }
  if (formData.has("resolveQuestion")) {
    update.resolveQuestion = formData.get("resolveQuestion") as string;
  }
  if (formData.has("resolveDescription")) {
    update.resolveDescription = formData.get("resolveDescription") as string;
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
  const logoFetcher = useFetcher();
  const ticketingFetcher = useFetcher();

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [selectedModel, setSelectedModel] = useState<LlmModel>(
    loaderData.scrape.llmModel ?? "gpt_4o_mini"
  );
  const [ticketingEnabled, setTicketingEnabled] = useState(
    loaderData.scrape.ticketingEnabled ?? false
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
          title="Logo"
          description="Set the logo URL for this collection. It will be shown on embed widget and other appropriate places."
          fetcher={logoFetcher}
        >
          <Stack>
            <Center
              w={"100px"}
              h={"100px"}
              bg={"gray.100"}
              rounded={"lg"}
              p={2}
            >
              {loaderData.scrape.logoUrl ? (
                <Image src={loaderData.scrape.logoUrl} alt="Logo" />
              ) : (
                <Text fontSize={"3xl"} opacity={0.4}>
                  <TbPhoto />
                </Text>
              )}
            </Center>
            <Input
              name="logoUrl"
              defaultValue={loaderData.scrape.logoUrl ?? ""}
              placeholder="Enter a logo URL"
              pattern="https://.*"
            />
          </Stack>
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
          title="Ticketing support"
          description="Enable ticketing support for this collection. If enabled, users will be able to create support tickets and you can resolve them from Tickets section."
          fetcher={ticketingFetcher}
        >
          <input type="hidden" name="from-ticketing-enabled" value={"true"} />
          <Switch
            name="ticketing"
            defaultChecked={loaderData.scrape.ticketingEnabled ?? false}
            onCheckedChange={(e) => setTicketingEnabled(e.checked)}
          >
            Active
          </Switch>
          {ticketingEnabled && (
            <Input
              name="resolveQuestion"
              defaultValue={loaderData.scrape.resolveQuestion ?? ""}
              placeholder="Enter the question to ask if issue resolved"
            />
          )}
          {ticketingEnabled && (
            <Input
              name="resolveDescription"
              defaultValue={loaderData.scrape.resolveDescription ?? ""}
              placeholder="A description"
            />
          )}
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
                  <Select.ValueText placeholder="Select model" />
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
          bg={"brand.danger.subtle"}
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

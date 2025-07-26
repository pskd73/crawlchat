import {
  Alert,
  Badge,
  Box,
  Center,
  createListCollection,
  DataList,
  Drawer,
  Group,
  HStack,
  IconButton,
  Image,
  Input,
  Portal,
  RadioCard,
  Slider,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { redirect, useFetcher } from "react-router";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/settings-section";
import { prisma } from "~/prisma";
import type { Route } from "./+types/settings";
import { getAuthUser } from "~/auth/middleware";
import type {
  LlmModel,
  Prisma,
  RichBlockConfig,
  Scrape,
  User,
} from "libs/prisma";
import { getSession } from "~/session";
import {
  TbCrown,
  TbPencil,
  TbPhoto,
  TbPlus,
  TbSettings,
  TbTrash,
} from "react-icons/tb";
import { Page } from "~/components/page";
import moment from "moment";
import { Button } from "~/components/ui/button";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSessionScrapeId } from "./util";
import { createToken } from "~/jwt";
import { Switch } from "~/components/ui/switch";
import { Field } from "~/components/ui/field";
import {
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "~/components/ui/select";
import { toaster } from "~/components/ui/toaster";

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

  return { scrape, user: user! };
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
  if (formData.has("richBlocksJsonString")) {
    const blocks = JSON.parse(
      formData.get("richBlocksJsonString") as string
    ) as RichBlockConfig[];
    update.richBlocksConfig = {
      blocks: blocks.map((b) => ({
        ...b,
        prompt: makeRichBlockPrompt(b),
      })) as any,
    };
  }
  if (formData.has("minScore")) {
    update.minScore = parseFloat(formData.get("minScore") as string);
  }
  if (formData.has("slug")) {
    const slug = formData.get("slug") as string;
    const existing = await prisma.scrape.findFirst({
      where: { slug },
    });
    if (existing && existing.id !== scrapeId) {
      return { error: "Slug already exists" };
    }
    update.slug = slug;
  }
  if (formData.has("from-show-sources")) {
    update.showSources = formData.get("showSources") === "on";
  }

  const scrape = await prisma.scrape.update({
    where: { id: scrapeId, userId: user!.id },
    data: update,
  });

  return { scrape };
}

function CTABlock({
  config,
  onChange,
}: {
  config: RichBlockConfig;
  onChange: (config: RichBlockConfig) => void;
}) {
  const [payload, setPayload] = useState(
    config.payload as {
      title: string;
      description: string;
      link: string;
    }
  );

  useEffect(() => {
    onChange({ ...config, payload });
  }, [payload]);

  return (
    <Stack>
      <Text fontSize={"sm"} opacity={0.5} mt={8}>
        CTA block contains a title, description and a link. It is used to
        redirect the user to a specific page. You can mention the prompts to
        fill details for title, description and link in below fields.
      </Text>
      <Field label="Title">
        <Input
          name="title"
          placeholder="Enter a title"
          value={payload.title ?? ""}
          onChange={(e) => setPayload({ ...payload, title: e.target.value })}
        />
      </Field>
      <Field label="Description">
        <Textarea
          name="description"
          placeholder="Enter a description"
          value={payload.description ?? ""}
          rows={4}
          onChange={(e) =>
            setPayload({ ...payload, description: e.target.value })
          }
        />
      </Field>
      <Field label="Link">
        <Input
          name="link"
          placeholder="Enter a link"
          value={payload.link ?? ""}
          onChange={(e) => setPayload({ ...payload, link: e.target.value })}
        />
      </Field>
    </Stack>
  );
}

function RichBlockDrawer({
  config,
  onClose,
}: {
  config: RichBlockConfig;
  onClose: (config: RichBlockConfig) => void;
}) {
  const typeCollection = useMemo(() => {
    return createListCollection({
      items: [{ label: "CTA", value: "cta" }],
    });
  }, []);
  const [blockType, setBlockType] = useState<string>(config.key);
  const [blockConfig, setBlockConfig] = useState<RichBlockConfig>(config);
  const contentRef = useRef<HTMLDivElement>(null);

  function handleClose() {
    onClose(blockConfig);
  }

  return (
    <Drawer.Root
      open={true}
      onOpenChange={(e) => {
        if (!e.open) {
          handleClose();
        }
      }}
    >
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content ref={contentRef}>
            <Drawer.Header>
              <Drawer.Title>Edit Block</Drawer.Title>
            </Drawer.Header>
            <Drawer.Body>
              <Stack>
                <SelectRoot
                  collection={typeCollection}
                  value={blockType ? [blockType] : []}
                  onValueChange={(e) => setBlockType(e.value[0])}
                >
                  <SelectLabel>Type</SelectLabel>
                  <SelectTrigger>
                    <SelectValueText placeholder="Select collection" />
                  </SelectTrigger>
                  <SelectContent
                    portalRef={contentRef as React.RefObject<HTMLElement>}
                  >
                    {typeCollection.items.map((item) => (
                      <SelectItem item={item} key={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>

                <Field label="Name">
                  <Input
                    name="name"
                    placeholder="Enter a name"
                    value={blockConfig.name}
                    onChange={(e) =>
                      setBlockConfig({
                        ...blockConfig,
                        name: e.target.value,
                      })
                    }
                  />
                </Field>

                <Field label="When to use it">
                  <Textarea
                    name="usage"
                    rows={4}
                    placeholder="Ex: Use when there is no answer"
                    value={(blockConfig.payload as any).usage}
                    onChange={(e) =>
                      setBlockConfig({
                        ...blockConfig,
                        payload: {
                          ...(blockConfig.payload as any),
                          usage: e.target.value,
                        },
                      })
                    }
                  />
                </Field>

                {blockType === "cta" && (
                  <CTABlock
                    config={blockConfig}
                    onChange={(config) => setBlockConfig(config)}
                  />
                )}
              </Stack>
            </Drawer.Body>
            <Drawer.Footer>
              <Button variant="outline" onClick={() => onClose(config)}>
                Cancel
              </Button>
              <Button onClick={() => onClose(blockConfig)}>Save</Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}

function makeRichBlockPrompt(block: RichBlockConfig) {
  if (block.key === "cta") {
    const payload = block.payload as {
      usage: string;
      title: string;
      description: string;
      link: string;
    };
    return [
      payload.usage,
      `Title: ${payload.title}`,
      `Description: ${payload.description}`,
      `Link: ${payload.link}`,
    ].join("\n");
  }
  return block.prompt;
}

function RichBlocksSettings({ scrape }: { scrape: Scrape }) {
  const richBlocksFetcher = useFetcher();
  const [richBlocks, setRichBlocks] = useState<RichBlockConfig[]>(
    scrape.richBlocksConfig?.blocks ?? []
  );
  const [selectedIdx, setSelectedIdx] = useState<number>();
  const selectedConfig = useMemo(() => {
    return selectedIdx !== undefined ? richBlocks[selectedIdx] : undefined;
  }, [richBlocks, selectedIdx]);

  function handleUpdateBlock(config: RichBlockConfig, idx: number) {
    setRichBlocks((blocks) => {
      const newBlocks = [...blocks];
      newBlocks[idx] = config;
      return newBlocks;
    });
  }

  function handleCloseBlock(config: RichBlockConfig) {
    handleUpdateBlock(config, selectedIdx!);
    setSelectedIdx(undefined);
  }

  function handleAddBlock() {
    setRichBlocks((blocks) => {
      const newBlocks = [...blocks];
      newBlocks.push({
        key: "cta",
        prompt: "Add a CTA block",
        name: `Block ${blocks.length + 1}`,
        payload: {},
      });
      return newBlocks;
    });
    setSelectedIdx(richBlocks.length);
  }

  function handleDeleteBlock(idx: number) {
    setRichBlocks((blocks) => {
      const newBlocks = [...blocks];
      newBlocks.splice(idx, 1);
      return newBlocks;
    });
  }

  return (
    <>
      <SettingsSection
        id="rich-blocks"
        title={
          <Group>
            <Text>Rich Blocks</Text>
            <Badge variant={"surface"}>Experimental</Badge>
          </Group>
        }
        plainTitle="Rich Blocks"
        description="Rich blocks are interactive UI elements that would be embedded in the AI response. You can add multiple blocks and customize them as per your needs."
        fetcher={richBlocksFetcher}
      >
        <input
          type="hidden"
          name="richBlocksJsonString"
          value={JSON.stringify(richBlocks)}
        />
        <Stack>
          {richBlocks.map((block, idx) => (
            <Group
              key={idx}
              border={"1px solid"}
              borderColor={"gray.200"}
              rounded={"lg"}
              py={2}
              px={2}
              pl={4}
              maxW={"400px"}
              w="full"
              justifyContent={"space-between"}
            >
              <Stack gap={0}>
                <Text>{block.name}</Text>
                <Text fontSize={"xs"} opacity={0.5} lineHeight={0.6}>
                  {block.key}
                </Text>
              </Stack>
              <Group>
                <IconButton
                  variant={"subtle"}
                  size={"sm"}
                  onClick={() => setSelectedIdx(idx)}
                >
                  <TbPencil />
                </IconButton>
                <IconButton
                  variant={"subtle"}
                  size={"sm"}
                  onClick={() => handleDeleteBlock(idx)}
                  colorPalette={"red"}
                >
                  <TbTrash />
                </IconButton>
              </Group>
            </Group>
          ))}
          <Box>
            <Button variant={"subtle"} onClick={handleAddBlock}>
              Add a Block
              <TbPlus />
            </Button>
          </Box>
        </Stack>
      </SettingsSection>
      {selectedConfig && (
        <RichBlockDrawer config={selectedConfig} onClose={handleCloseBlock} />
      )}
    </>
  );
}

function TicketingSettings({ scrape }: { scrape: Scrape }) {
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.data) {
      window.location.reload();
    }
  }, [fetcher.data]);

  return (
    <SettingsSection
      id="resolved-enquiry"
      title="Support tickets"
      description="Enable the support tickets for this collection to start receiving support tickets either when the AI has no answer for a given question or the user choses to create a ticket."
      fetcher={fetcher}
    >
      <input type="hidden" name="from-ticketing-enabled" value={"true"} />
      <Switch
        name="ticketing"
        defaultChecked={scrape.ticketingEnabled ?? false}
      >
        Active
      </Switch>
    </SettingsSection>
  );
}

function AiModelSettings({ scrape, user }: { scrape: Scrape; user: User }) {
  const modelFetcher = useFetcher();
  const [selectedModel, setSelectedModel] = useState<LlmModel>(
    scrape.llmModel ?? "gpt_4o_mini"
  );
  const models = useMemo(() => {
    return createListCollection({
      items: [
        {
          label: "OpenAI 4o-mini",
          value: "gpt_4o_mini",
          creditsPerMessage: 1,
          description: "Base model, does the job.",
          plans: ["free", "starter", "pro"],
        },
        {
          label: "Gemini 2.5-flash",
          value: "gemini_2_5_flash",
          creditsPerMessage: 1,
          description: "Good for most of the use cases.",
          plans: ["starter", "pro"],
        },
        {
          label: "OpenAI o4-mini",
          value: "o4_mini",
          creditsPerMessage: 2,
          description:
            "Best for complex use cases, programming docs, better searches.",
          plans: ["pro"],
        },
      ],
    });
  }, []);

  function isAllowed(plans: string[]) {
    if (plans.includes("free")) {
      return true;
    }

    return plans.some((plan) => user.plan?.planId === plan);
  }

  return (
    <SettingsSection
      id="ai-model"
      title="AI Model"
      description="Select the AI model to use for the messages across channels."
      fetcher={modelFetcher}
    >
      <Stack>
        <RadioCard.Root
          defaultValue={scrape.llmModel ?? "gpt_4o_mini"}
          onValueChange={(e) => setSelectedModel(e.value as LlmModel)}
        >
          <HStack align="stretch">
            {models.items.map((item) => (
              <RadioCard.Item
                key={item.value}
                value={item.value}
                disabled={!isAllowed(item.plans)}
              >
                <RadioCard.ItemHiddenInput />
                <RadioCard.ItemControl>
                  <RadioCard.ItemContent>
                    <RadioCard.ItemText
                      gap={2}
                      display={"flex"}
                      alignItems={"center"}
                    >
                      {item.label}
                      {item.plans[0] === "pro" && (
                        <Badge
                          variant={"solid"}
                          colorPalette={"brand"}
                          size={"xs"}
                        >
                          <TbCrown /> Pro
                        </Badge>
                      )}
                      {item.plans[0] === "starter" && (
                        <Badge
                          variant={"surface"}
                          colorPalette={"brand"}
                          size={"xs"}
                        >
                          <TbCrown /> Starter
                        </Badge>
                      )}
                    </RadioCard.ItemText>
                    <RadioCard.ItemDescription>
                      {item.creditsPerMessage}{" "}
                      {item.creditsPerMessage === 1 ? "credit" : "credits"} /
                      message
                    </RadioCard.ItemDescription>

                    <RadioCard.ItemDescription>
                      {item.description}
                    </RadioCard.ItemDescription>
                  </RadioCard.ItemContent>
                  <RadioCard.ItemIndicator />
                </RadioCard.ItemControl>
              </RadioCard.Item>
            ))}
          </HStack>
        </RadioCard.Root>

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
  );
}

function ShowSourcesSetting({ scrape, user }: { scrape: Scrape; user: User }) {
  const showSourcesFetcher = useFetcher();

  function isAllowed() {
    return ["starter", "pro"].includes(user.plan?.planId ?? "free");
  }

  return (
    <SettingsSection
      id="show-sources"
      title="Show sources"
      description="Show the sources that the chatbot used from the knowledge base. It will be visible on the chat widget under every answer and on Discord/Slcack messages."
      fetcher={showSourcesFetcher}
    >
      <Group>
        <input type="hidden" name="from-show-sources" value={"true"} />
        <Switch
          name="showSources"
          defaultChecked={scrape.showSources ?? false}
          disabled={!isAllowed()}
        >
          Active
        </Switch>
        <Badge variant={"surface"} colorPalette={"brand"} size={"xs"}>
          <TbCrown /> Starter
        </Badge>
      </Group>
    </SettingsSection>
  );
}

export default function ScrapeSettings({ loaderData }: Route.ComponentProps) {
  const promptFetcher = useFetcher();
  const nameFetcher = useFetcher();
  const deleteFetcher = useFetcher();

  const logoFetcher = useFetcher();
  const minScoreFetcher = useFetcher();
  const slugFetcher = useFetcher();

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [minScore, setMinScore] = useState(loaderData.scrape.minScore ?? 0);

  useEffect(() => {
    if (deleteConfirm) {
      setTimeout(() => {
        setDeleteConfirm(false);
      }, 5000);
    }
  }, [deleteConfirm]);

  useEffect(() => {
    if (slugFetcher.data?.error) {
      toaster.error({
        title: "Error",
        description: slugFetcher.data.error,
      });
    }
  }, [slugFetcher.data?.error]);

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
      <SettingsSectionProvider>
        <SettingsContainer>
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
            id="name"
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
            id="slug"
            title="Slug"
            description="Give it a slug and you can use it in the URL to access the chatbot. Should be 4-16 characters long and can only contain lowercase letters, numbers, and hyphens."
            fetcher={slugFetcher}
          >
            <Input
              name="slug"
              defaultValue={loaderData.scrape.slug ?? ""}
              placeholder="Ex: remotion"
              pattern="^[a-z0-9\-]{4,32}$"
              required
            />
          </SettingsSection>

          <SettingsSection
            id="logo"
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
            id="prompt"
            title="Chat Prompt"
            description="Customize the chat prompt for this scrape."
            fetcher={promptFetcher}
          >
            <Textarea
              name="chatPrompt"
              defaultValue={loaderData.scrape.chatPrompt ?? ""}
              placeholder="Enter a custom chat prompt for this scrape."
              rows={5}
            />
          </SettingsSection>

          <TicketingSettings scrape={loaderData.scrape} />

          <SettingsSection
            id="min-score"
            title="Min score"
            description="Configure the minimum score (relevance score) required for the knowledge base to have to be considered for a question. If it is too high, it will not be able to answer questions as much. If it is too low, it will answer questions that are not relevant."
            fetcher={minScoreFetcher}
          >
            <Group>
              <Slider.Root
                width="300px"
                defaultValue={[minScore]}
                onValueChange={(e) => setMinScore(e.value[0])}
                min={0}
                max={1}
                step={0.01}
              >
                <Slider.Control>
                  <Slider.Track>
                    <Slider.Range />
                  </Slider.Track>
                  <Slider.Thumb index={0}>
                    <Slider.HiddenInput name="minScore" />
                  </Slider.Thumb>
                </Slider.Control>
              </Slider.Root>

              <Badge size={"lg"} variant={"surface"}>
                {minScore}
              </Badge>
            </Group>
          </SettingsSection>

          <AiModelSettings scrape={loaderData.scrape} user={loaderData.user} />

          <ShowSourcesSetting
            scrape={loaderData.scrape}
            user={loaderData.user}
          />

          <RichBlocksSettings scrape={loaderData.scrape} />

          <SettingsSection
            id="delete-collection"
            title="Delete collection"
            description="This will delete the collection and all the messages, knowledge base, and the other data that is associated with it. This is not reversible."
            danger
            actionRight={
              <Button
                colorPalette={"red"}
                onClick={handleDelete}
                loading={deleteFetcher.state !== "idle"}
                variant={deleteConfirm ? "solid" : "outline"}
                size={"sm"}
              >
                {deleteConfirm ? "Sure to delete?" : "Delete"}
                <TbTrash />
              </Button>
            }
          />
        </SettingsContainer>
      </SettingsSectionProvider>
    </Page>
  );
}

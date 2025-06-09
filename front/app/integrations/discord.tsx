import {
  Group,
  Input,
  Stack,
  Text,
  IconButton,
  List,
  NumberInput,
  NativeSelect,
  Box,
} from "@chakra-ui/react";
import { useFetcher } from "react-router";
import { SettingsSection } from "~/settings-section";
import type { Route } from "./+types/discord";
import type { Prisma } from "libs/prisma";
import { prisma } from "~/prisma";
import { getAuthUser } from "~/auth/middleware";
import { TbArrowRight, TbBrandDiscord, TbInfoCircle } from "react-icons/tb";
import {
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverRoot,
  PopoverTitle,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import { getSessionScrapeId } from "~/scrapes/util";
import { Switch } from "~/components/ui/switch";
import { useEffect, useState } from "react";
import { Field } from "~/components/ui/field";
import { toaster } from "~/components/ui/toaster";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  const scrapeId = await getSessionScrapeId(request);

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

  const scrapeId = await getSessionScrapeId(request);

  const formData = await request.formData();
  const discordServerId = formData.get("discordServerId") as string;

  const update: Prisma.ScrapeUpdateInput = {};

  if (discordServerId) {
    update.discordServerId = discordServerId;
  }

  if (formData.has("fromDiscordDraft")) {
    const enabled = formData.get("discordDraftEnabled") === "on";
    if (enabled) {
      const sourceChannelId = formData.get(
        "discordDraftSourceChannelId"
      ) as string;
      const emoji = formData.get("discordDraftEmoji") as string;
      const destinationChannelId = formData.get(
        "discordDraftDestinationChannelId"
      ) as string;

      if (!sourceChannelId || !destinationChannelId || !emoji) {
        return { error: "All fields are required" };
      }

      update.discordDraftConfig = {
        sourceChannelIds: [sourceChannelId],
        destinationChannelId: destinationChannelId,
        emoji,
      };
    } else {
      update.discordDraftConfig = null;
    }
  }

  const scrape = await prisma.scrape.update({
    where: { id: scrapeId },
    data: update,
  });

  return { scrape };
}

export default function ScrapeIntegrations({
  loaderData,
}: Route.ComponentProps) {
  const discordServerIdFetcher = useFetcher();
  const discordDraftFetcher = useFetcher();
  const [discordDraftEnabled, setDiscordDraftEnabled] = useState(
    !!loaderData.scrape.discordDraftConfig
  );

  useEffect(() => {
    if (discordDraftFetcher.data?.error) {
      toaster.error({
        title: "Error",
        description: discordDraftFetcher.data.error,
      });
    }
  }, [discordDraftFetcher.data]);

  return (
    <Stack gap={6}>
      <Text maxW={"900px"}>
        You have two Discord bots that you can install on your server with
        different bot names. Pick your favorite one from the following options
        and install. You need to enter the server id below to make it work!
      </Text>
      <Group>
        <Button asChild variant={"outline"}>
          <a
            href="https://discord.com/oauth2/authorize?client_id=1346845279692918804"
            target="_blank"
          >
            <TbBrandDiscord />
            @CrawlChat
            <TbArrowRight />
          </a>
        </Button>
        <Button asChild variant={"outline"}>
          <a
            href="https://discord.com/oauth2/authorize?client_id=1353765834321039502"
            target="_blank"
          >
            <TbBrandDiscord />
            @AiBot-CrawlChat
            <TbArrowRight />
          </a>
        </Button>
      </Group>
      <SettingsSection
        id="discord-server-id"
        title={
          <Group>
            <Text>Discord Server Id</Text>
            <PopoverRoot>
              <PopoverTrigger asChild>
                <IconButton size={"xs"} variant={"ghost"}>
                  <TbInfoCircle />
                </IconButton>
              </PopoverTrigger>
              <PopoverContent>
                <PopoverArrow />
                <PopoverBody>
                  <PopoverTitle fontWeight="medium">
                    Find server ID
                  </PopoverTitle>
                  <List.Root as="ol">
                    <List.Item>Go to "Server Settings"</List.Item>
                    <List.Item>Click on "Widget"</List.Item>
                    <List.Item>Copy the server ID</List.Item>
                  </List.Root>
                </PopoverBody>
              </PopoverContent>
            </PopoverRoot>
          </Group>
        }
        description="Integrate CrawlChat with your Discord server to bother answer the queries and also to learn from the conversations."
        fetcher={discordServerIdFetcher}
      >
        <Stack>
          <Input
            name="discordServerId"
            placeholder="Enter your Discord server ID"
            defaultValue={loaderData.scrape.discordServerId ?? ""}
            maxW={"400px"}
          />
        </Stack>
      </SettingsSection>

      <SettingsSection
        title={
          <Group>
            <Text>Drafting</Text>
            <IconButton size={"xs"} variant={"ghost"} asChild>
              <a
                href="https://guides.crawlchat.app/walkthrough/67fd0aad123cc427aca681a7/read"
                target="_blank"
              >
                <TbInfoCircle />
              </a>
            </IconButton>
          </Group>
        }
        description="This features let's you draft the answers from your diccord channel with multiple prompts so that you can tweak the answer the way you want."
        fetcher={discordDraftFetcher}
      >
        <Stack gap={4}>
          <input type="hidden" name="fromDiscordDraft" value={"true"} />
          <Switch
            name="discordDraftEnabled"
            maxW={"400px"}
            defaultChecked={discordDraftEnabled}
            onCheckedChange={(e) => setDiscordDraftEnabled(e.checked)}
          >
            Enable
          </Switch>
          {discordDraftEnabled && (
            <>
              <Field
                label="Source Channel Id"
                helperText="The channel id where the original questions are posted"
              >
                <Input
                  name="discordDraftSourceChannelId"
                  placeholder="Enter your Discord server ID"
                  defaultValue={
                    loaderData.scrape.discordDraftConfig
                      ?.sourceChannelIds?.[0] ?? ""
                  }
                  maxW={"400px"}
                />
              </Field>

              <Field
                label="Destination Channel Id"
                helperText="The channel id where the draft will be posted"
              >
                <Input
                  name="discordDraftDestinationChannelId"
                  placeholder="Enter your Discord server ID"
                  defaultValue={
                    loaderData.scrape.discordDraftConfig
                      ?.destinationChannelId ?? ""
                  }
                  maxW={"400px"}
                />
              </Field>

              <NativeSelect.Root maxW="400px">
                <NativeSelect.Field
                  placeholder="Emoji"
                  name="discordDraftEmoji"
                  defaultValue={
                    loaderData.scrape.discordDraftConfig?.emoji ?? "✍️"
                  }
                >
                  <option value="✍️">✍️</option>
                  <option value="✏️">✏️</option>
                  <option value="🤔">🤔</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </>
          )}
        </Stack>
      </SettingsSection>
    </Stack>
  );
}

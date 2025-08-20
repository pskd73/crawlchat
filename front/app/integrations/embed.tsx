import {
  Box,
  Code,
  createListCollection,
  Group,
  HStack,
  SegmentGroup,
  Stack,
  Text,
} from "@chakra-ui/react";
import { prisma } from "~/prisma";
import { getAuthUser } from "~/auth/middleware";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/settings-section";
import { useFetcher } from "react-router";
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "~/components/ui/select";
import type { WidgetConfig, WidgetSize } from "libs/prisma";
import { TbCode } from "react-icons/tb";
import { useMemo, useState } from "react";
import { ClipboardIconButton, ClipboardRoot } from "~/components/ui/clipboard";
import type { Route } from "./+types/embed";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { Switch } from "~/components/ui/switch";
import { SiDocusaurus } from "react-icons/si";

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

const sizes = createListCollection({
  items: [
    { label: "Small", value: "small" },
    { label: "Large", value: "large" },
  ],
});

function makeScriptCode(scrapeId: string) {
  if (typeof window === "undefined") {
    return { script: "", docusaurusConfig: "" };
  }

  const origin = window.location.origin;

  const script = `<script 
  src="${origin}/embed.js" 
  id="crawlchat-script" 
  data-id="${scrapeId}"
></script>`;

  const docusaurusConfig = `headTags: [
  {
      "tagName": "script",
      "attributes": {
        "src": "${origin}/embed.js",
        "id": "crawlchat-script",
        "data-id": "${scrapeId}"
      },
    },
],`;

  return { script, docusaurusConfig };
}

const widgetConfigTabs = createListCollection({
  items: [
    { label: "Code", value: "code", icon: <TbCode /> },
    { label: "Docusaurus", value: "docusaurus", icon: <SiDocusaurus /> },
  ],
});

export default function ScrapeEmbed({ loaderData }: Route.ComponentProps) {
  const sizeFetcher = useFetcher();
  const privateFetcher = useFetcher();
  const [tab, setTab] = useState<"code" | "docusaurus">("code");
  const scriptCode = useMemo(
    () => makeScriptCode(loaderData.scrape?.id ?? ""),
    [loaderData.scrape?.id]
  );

  return (
    <SettingsSectionProvider>
      <SettingsContainer>
        <SettingsSection
          id="embed"
          title="Embed Ask AI"
          description="Copy paste the <script> tag below to your website."
        >
          <Group alignItems={"flex-start"} gap={10}>
            <Stack flex={1}>
              <Box>
                <SegmentGroup.Root
                  value={tab}
                  onValueChange={(e) =>
                    setTab(e.value as "code" | "docusaurus")
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
          id="private"
          title="Private"
          description="Make the bot private. The bot will only work with Discrod and Slack bots."
          fetcher={privateFetcher}
        >
          <input type="hidden" name="from-private" value={"true"} />
          <Switch
            name="private"
            defaultChecked={loaderData.scrape?.widgetConfig?.private ?? false}
          />
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
      </SettingsContainer>
    </SettingsSectionProvider>
  );
}

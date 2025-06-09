import {
  Group,
  Heading,
  IconButton,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useFetcher } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { SettingsSection } from "~/settings-section";
import { prisma } from "~/prisma";
import type { Prisma } from "libs/prisma";
import { MarkdownProse } from "~/widget/markdown-prose";
import { TbHelp } from "react-icons/tb";
import type { Route } from "./+types/mcp";
import { getSessionScrapeId } from "~/scrapes/util";
import { makeCursorMcpJson, makeMcpName } from "~/mcp/setup";
import { makeMcpCommand } from "~/mcp/setup";

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

  const mcpToolName = formData.get("mcpToolName") as string | null;

  const update: Prisma.ScrapeUpdateInput = {};
  if (mcpToolName) {
    update.mcpToolName = mcpToolName;
  }

  const scrape = await prisma.scrape.update({
    where: { id: scrapeId, userId: user!.id },
    data: update,
  });

  return { scrape };
}

export default function ScrapeMcp({ loaderData }: Route.ComponentProps) {
  const toolNameFetcher = useFetcher();

  const name = makeMcpName(loaderData.scrape);
  const mcpCommand = makeMcpCommand(loaderData.scrape.id, name);
  const cursorMcpCommand = makeCursorMcpJson(loaderData.scrape.id, name);

  return (
    <Stack gap={6}>
      <Stack
        border={"1px solid"}
        borderColor={"brand.outline"}
        p={4}
        borderRadius={"md"}
      >
        <Heading size={"md"}>
          <Group>
            <Text>MCP Command</Text>
            <IconButton size={"xs"} variant={"ghost"} asChild>
              <a
                href="https://guides.crawlchat.app/walkthrough/67db0080600010f091e529b7"
                target="_blank"
              >
                <TbHelp />
              </a>
            </IconButton>
          </Group>
        </Heading>
        <Text opacity={0.5} fontSize={"sm"}>
          MCP (Model Context Protocol) is a standard protocol to connect with
          LLM applications like Claude App, Cursor, Windsurf or more such
          applications. Use this MCP server so that you (& your customers) can
          consume your collection right from their favorite AI apps.
        </Text>
        <MarkdownProse noMarginCode>
          {`\`\`\`sh\n${mcpCommand}\n\`\`\``}
        </MarkdownProse>
      </Stack>

      <Stack
        border={"1px solid"}
        borderColor={"brand.outline"}
        p={4}
        borderRadius={"md"}
      >
        <Heading size={"md"}>
          <Group>
            <Text>Cursor MCP Command</Text>
            <IconButton size={"xs"} variant={"ghost"} asChild>
              <a
                href="https://guides.crawlchat.app/walkthrough/67db0080600010f091e529b7"
                target="_blank"
              >
                <TbHelp />
              </a>
            </IconButton>
          </Group>
        </Heading>
        <Text opacity={0.5} fontSize={"sm"}>
          Cursor needs a JSON snippet to be added to the Cursor settings. Copy
          and paste the following snippet
        </Text>
        <MarkdownProse noMarginCode>
          {`\`\`\`json\n${cursorMcpCommand}\n\`\`\``}
        </MarkdownProse>
      </Stack>

      <SettingsSection
        title="Search tool name"
        description="MCP clients rely on this name to identify when to use this tool. Give it a descriptive name. Should be alphanumeric and _ only."
        fetcher={toolNameFetcher}
      >
        <Input
          name="mcpToolName"
          defaultValue={loaderData.scrape.mcpToolName ?? ""}
          placeholder="Ex: search_mytool_documentation"
          pattern="^[a-zA-Z0-9_]+$"
        />
      </SettingsSection>
    </Stack>
  );
}

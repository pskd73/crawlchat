import { Heading, Input, Stack, Text } from "@chakra-ui/react";
import { useFetcher } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { SettingsSection } from "~/dashboard/settings";
import type { Route } from "./+types/scrape-mcp";
import { prisma } from "~/prisma";
import type { Prisma } from "libs/prisma";
import { MarkdownProse } from "~/widget/markdown-prose";

export async function loader({ params, request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  const scrape = await prisma.scrape.findUnique({
    where: { id: params.id, userId: user!.id },
  });

  if (!scrape) {
    throw new Response("Not found", { status: 404 });
  }

  return { scrape };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const formData = await request.formData();

  const mcpToolName = formData.get("mcpToolName") as string | null;

  const update: Prisma.ScrapeUpdateInput = {};
  if (mcpToolName) {
    update.mcpToolName = mcpToolName;
  }

  const scrape = await prisma.scrape.update({
    where: { id: params.id, userId: user!.id },
    data: update,
  });

  return { scrape };
}

export default function ScrapeMcp({ loaderData }: Route.ComponentProps) {
  const toolNameFetcher = useFetcher();

  const name =
    loaderData.scrape.mcpToolName ??
    loaderData.scrape.title?.replaceAll(" ", "_") ??
    loaderData.scrape.url;
  const mcpCommand = `npx crawl-chat-mcp --id=${loaderData.scrape.id} --name=${name}`;
  const cursorMcpCommand = `"${name}_crawlchat": {
  "command": "npx",
  "args": [
    "crawl-chat-mcp",
    "--id=${loaderData.scrape.id}",
    "--name=${name}"
  ]
}`;

  return (
    <Stack gap={6}>
      <Stack
        border={"1px solid"}
        borderColor={"brand.outline"}
        p={4}
        borderRadius={"md"}
      >
        <Heading size={"md"}>MCP Command</Heading>
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
        <Heading size={"md"}>Cursor MCP Command</Heading>
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

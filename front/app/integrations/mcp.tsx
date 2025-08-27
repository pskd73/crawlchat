import type { Route } from "./+types/mcp";
import type { Prisma } from "libs/prisma";
import { useFetcher } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/settings-section";
import { prisma } from "~/prisma";
import { MarkdownProse } from "~/widget/markdown-prose";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { makeCursorMcpJson, makeMcpName } from "~/mcp/setup";
import { makeMcpCommand } from "~/mcp/setup";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const scrape = await prisma.scrape.findUnique({
    where: { id: scrapeId },
  });

  if (!scrape) {
    throw new Response("Not found", { status: 404 });
  }

  return { scrape };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();

  const update: Prisma.ScrapeUpdateInput = {};
  if (formData.get("mcpToolName")) {
    update.mcpToolName = formData.get("mcpToolName") as string;
  }

  const scrape = await prisma.scrape.update({
    where: { id: scrapeId },
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
    <SettingsSectionProvider>
      <SettingsContainer>
        <SettingsSection
          title="MCP Command"
          description="MCP (Model Context Protocol) is a standard protocol to connect with
          LLM applications like Claude App, Cursor, Windsurf or more such
          applications. Use this MCP server so that you (& your customers) can
          consume your collection right from their favorite AI apps."
          id="mcp-command"
        >
          <MarkdownProse noMarginCode>
            {`\`\`\`sh\n${mcpCommand}\n\`\`\``}
          </MarkdownProse>
        </SettingsSection>

        <SettingsSection
          title="Cursor MCP Command"
          description="Cursor needs a JSON snippet to be added to the Cursor settings. Copy and paste the following snippet"
          id="cursor-mcp-command"
        >
          <MarkdownProse noMarginCode>
            {`\`\`\`json\n${cursorMcpCommand}\n\`\`\``}
          </MarkdownProse>
        </SettingsSection>

        <SettingsSection
          title="Search tool name"
          description="MCP clients rely on this name to identify when to use this tool. Give it a descriptive name. Should be alphanumeric and _ only."
          fetcher={toolNameFetcher}
          id="search-tool-name"
        >
          <input
            type="text"
            className="input"
            name="mcpToolName"
            defaultValue={loaderData.scrape.mcpToolName ?? ""}
            placeholder="Ex: search_mytool_documentation"
            pattern="^[a-zA-Z0-9_]+$"
          />
        </SettingsSection>
      </SettingsContainer>
    </SettingsSectionProvider>
  );
}

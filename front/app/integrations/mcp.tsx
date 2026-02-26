import type { Route } from "./+types/mcp";
import type { Prisma } from "@packages/common/prisma";
import { useFetcher } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/components/settings-section";
import { useDirtyForm } from "~/components/use-dirty-form";
import { prisma } from "@packages/common/prisma";
import { MarkdownProse } from "~/widget/markdown-prose";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { makeCursorMcpJson, makeMcpName } from "~/mcp-command";
import { makeMcpCommand } from "~/mcp-command";
import { makeMeta } from "~/meta";
import { Page } from "~/components/page";
import { MCPIcon } from "~/components/mcp-icon";

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

export function meta({ data }: Route.MetaArgs) {
  return makeMeta({
    title: "MCP - CrawlChat",
  });
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
  const form = useDirtyForm({
    mcpToolName: loaderData.scrape.mcpToolName ?? "",
  });

  const name = makeMcpName(loaderData.scrape);
  const mcpCommand = makeMcpCommand(loaderData.scrape.id, name);
  const cursorMcpCommand = makeCursorMcpJson(loaderData.scrape.id, name);

  return (
    <Page title={"MCP server"} icon={<MCPIcon />}>
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
            dirty={form.isDirty("mcpToolName")}
          >
            <input
              type="text"
              className="input"
              name="mcpToolName"
              value={(form.getValue("mcpToolName") as string) ?? ""}
              onChange={form.handleChange("mcpToolName")}
              placeholder="Ex: search_mytool_documentation"
              pattern="^[a-zA-Z0-9_]+$"
            />
          </SettingsSection>
        </SettingsContainer>
      </SettingsSectionProvider>
    </Page>
  );
}

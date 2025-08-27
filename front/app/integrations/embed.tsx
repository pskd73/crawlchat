import type { Route } from "./+types/embed";
import type { WidgetConfig, WidgetSize } from "libs/prisma";
import { prisma } from "~/prisma";
import { getAuthUser } from "~/auth/middleware";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/settings-section";
import { useFetcher } from "react-router";
import { useMemo, useState } from "react";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { MarkdownProse } from "~/widget/markdown-prose";
import { Select } from "~/components/select";

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
          <div className="flex flex-col gap-2 flex-1">
            <div className="tabs tabs-lift">
              <input
                type="radio"
                name="embed-code"
                className="tab"
                aria-label="Code"
              />
              <div className="tab-content bg-base-100 border-base-300 p-6">
                <MarkdownProse>
                  {`\`\`\`json
${scriptCode.script}
\`\`\`
`}
                </MarkdownProse>
              </div>

              <input
                type="radio"
                name="embed-code"
                className="tab"
                aria-label="Docusaurus"
                defaultChecked
              />
              <div className="tab-content bg-base-100 border-base-300 p-6">
                <MarkdownProse>
                  {`\`\`\`json
${scriptCode.docusaurusConfig}
\`\`\`
`}
                </MarkdownProse>
              </div>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          id="private"
          title="Private"
          description="Make the bot private. The bot will only work with Discrod and Slack bots."
          fetcher={privateFetcher}
        >
          <input type="hidden" name="from-private" value={"true"} />
          <label className="label">
            <input
              type="checkbox"
              className="toggle"
              name="private"
              defaultChecked={loaderData.scrape?.widgetConfig?.private ?? false}
            />
            Active
          </label>
        </SettingsSection>

        <SettingsSection
          id="widget-size"
          title="Widget size"
          description="Set the size of the widget to be when it's embedded on your website"
          fetcher={sizeFetcher}
        >
          <Select
            label="Size"
            options={[
              { label: "Small", value: "small" },
              { label: "Large", value: "large" },
            ]}
            defaultValue={loaderData.scrape?.widgetConfig?.size ?? "small"}
            name="size"
          />
        </SettingsSection>
      </SettingsContainer>
    </SettingsSectionProvider>
  );
}

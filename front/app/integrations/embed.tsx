import { prisma } from "@packages/common/prisma";
import { useMemo } from "react";
import { TbWorld } from "react-icons/tb";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { Page } from "~/components/page";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/components/settings-section";
import { makeMeta } from "~/meta";
import { MarkdownProse } from "~/widget/markdown-prose";
import type { Route } from "./+types/embed";

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

export function meta({ data }: Route.MetaArgs) {
  return makeMeta({
    title: "Web embed - CrawlChat",
  });
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
  const scriptCode = useMemo(
    () => makeScriptCode(loaderData.scrape?.id ?? ""),
    [loaderData.scrape?.id]
  );

  return (
    <Page title={"Web embed"} icon={<TbWorld />}>
      <SettingsSectionProvider>
        <SettingsContainer>
          <SettingsSection
            id="embed"
            title="Embed - Ask AI"
            description="Copy paste the <script> tag below to your website."
          >
            <div className="flex flex-col gap-2 flex-1">
              <div className="tabs tabs-lift">
                <input
                  type="radio"
                  name="embed-code"
                  className="tab"
                  aria-label="Code"
                  defaultChecked
                />
                <div className="tab-content bg-base-100 border-base-300 p-4">
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
                />
                <div className="tab-content bg-base-100 border-base-300 p-4">
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
        </SettingsContainer>
      </SettingsSectionProvider>
    </Page>
  );
}

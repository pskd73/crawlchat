import { prisma } from "@packages/common/prisma";
import { useMemo } from "react";
import { SiDocusaurus, SiMintlify } from "react-icons/si";
import { TbCode, TbWorld } from "react-icons/tb";
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
    return { script: "", docusaurus: "", mintlify: "" };
  }

  const origin = window.location.origin;

  const script = `<script 
  src="${origin}/embed.js" 
  id="crawlchat-script" 
  data-id="${scrapeId}"
></script>`;

  const docusaurus = `headTags: [
  {
      "tagName": "script",
      "attributes": {
        "src": "${origin}/embed.js",
        "id": "crawlchat-script",
        "data-id": "${scrapeId}"
        "data-sidepanel": "true" // optional
      },
    },
],`;

  const mintlify = `function inject() {
  const script = document.createElement("script");
  script.src = "${origin}/embed.js";
  script.id = "crawlchat-script";
  script.dataset.id = "${scrapeId}";
  script.dataset.sidepanel = true; // optional

  document.head.appendChild(script);
}

inject();`;

  return { script, docusaurus, mintlify };
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
          <SettingsSection id="embed" title="Embed - Ask AI" description={""}>
            <div className="flex flex-col gap-2 flex-1">
              <div className="tabs tabs-lift">
                <label className="tab gap-2">
                  <input type="radio" name="embed-code" defaultChecked />
                  <TbCode /> Code
                </label>
                <div className="tab-content bg-base-100 border-base-300 p-4">
                  <MarkdownProse>
                    {`Copy paste the \`<script>\` tag below to your website.\n
\`\`\`html
${scriptCode.script}
\`\`\`
`}
                  </MarkdownProse>
                </div>

                <label className="tab gap-2">
                  <input type="radio" name="embed-code" />
                  <SiDocusaurus />
                  Docusaurus
                </label>
                <div className="tab-content bg-base-100 border-base-300 p-4">
                  <MarkdownProse>
                    {`Copy paste the following config in your \`docusaurus.config.ts\`.\n
\`\`\`json
${scriptCode.docusaurus}
\`\`\`
`}
                  </MarkdownProse>
                  <div className="mt-6">
                    Explore about{" "}
                    <a
                      href="https://docs.crawlchat.app/connct/side-panel"
                      className="link link-primary"
                      target="_blank"
                    >
                      Side Panel
                    </a>
                  </div>
                </div>

                <label className="tab gap-2">
                  <input type="radio" name="embed-code" />
                  <SiMintlify />
                  Mintlify
                </label>
                <div className="tab-content bg-base-100 border-base-300 p-4">
                  <MarkdownProse>
                    {`Create \`crawlchat.js\` inside your root folder.\n
\`\`\`js
${scriptCode.mintlify}
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

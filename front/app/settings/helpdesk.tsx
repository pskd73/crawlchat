import cn from "@meltdownjs/cn";
import { createToken } from "@packages/common/jwt";
import type { HelpdeskConfig, Scrape } from "@packages/common/prisma";
import { prisma } from "@packages/common/prisma";
import { useMemo, useState } from "react";
import { TbPlus, TbSettings, TbTrash } from "react-icons/tb";
import { useFetcher } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { Page } from "~/components/page";
import { SettingsSection } from "~/components/settings-section";
import { Helpdesk } from "~/helpdesk/layout";
import { makeMeta } from "~/meta";
import type { Route } from "./+types/helpdesk";

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

  const scrapeWithConfig = scrape as Scrape & {
    helpdeskConfig?: HelpdeskConfig;
  };
  const helpdeskConfig: HelpdeskConfig = scrapeWithConfig.helpdeskConfig ?? {
    enabled: false,
    heroBg: "#7F0E87",
    logo: "https://crawlchat.app/logo-white.png",
    navLinks: [
      {
        label: "Website",
        href: "https://crawlchat.app",
      },
    ],
    heroTitle: "Ask about CrawlChat here",
    searchPlaceholder: "Ask your question here",
  };

  const userToken = createToken(scrape.id, {
    expiresInSeconds: 60 * 60 * 24,
  });

  const guides = await prisma.article.findMany({
    where: {
      scrapeId: scrape.id,
      purpose: "guide",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  return { scrape, helpdeskConfig, userToken, guides };
}

export function meta({ data }: Route.MetaArgs) {
  return makeMeta({
    title: "Helpdesk Settings - CrawlChat",
  });
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const enabled = formData.get("enabled") === "true";
  const heroBg = formData.get("heroBg") as string;
  const logo = formData.get("logo") as string;
  const heroTitle = formData.get("heroTitle") as string;
  const searchPlaceholder = formData.get("searchPlaceholder") as string;
  const navLinksJson = formData.get("navLinks") as string;

  const navLinks = JSON.parse(navLinksJson || "[]");

  const helpdeskConfig: HelpdeskConfig = {
    enabled,
    heroBg,
    logo,
    heroTitle,
    searchPlaceholder,
    navLinks,
  };

  await prisma.scrape.update({
    where: { id: scrapeId },
    data: {
      helpdeskConfig,
    },
  });

  return { success: true };
}

export default function HelpdeskSettings({ loaderData }: Route.ComponentProps) {
  const settingsFetcher = useFetcher();

  const [enabled, setEnabled] = useState(
    loaderData.helpdeskConfig.enabled ?? false
  );
  const [heroBg, setHeroBg] = useState(loaderData.helpdeskConfig.heroBg);
  const [logo, setLogo] = useState(loaderData.helpdeskConfig.logo);
  const [heroTitle, setHeroTitle] = useState(
    loaderData.helpdeskConfig.heroTitle
  );
  const [searchPlaceholder, setSearchPlaceholder] = useState(
    loaderData.helpdeskConfig.searchPlaceholder
  );
  const [navLinks, setNavLinks] = useState<
    Array<{ label: string; href: string }>
  >(loaderData.helpdeskConfig.navLinks ?? []);

  const previewConfig: HelpdeskConfig = useMemo(
    () => ({
      enabled,
      heroBg,
      logo,
      heroTitle,
      searchPlaceholder,
      navLinks,
    }),
    [enabled, heroBg, logo, heroTitle, searchPlaceholder, navLinks]
  );

  function handleAddNavLink() {
    setNavLinks([...navLinks, { label: "", href: "" }]);
  }

  function handleRemoveNavLink(index: number) {
    setNavLinks(navLinks.filter((_, i) => i !== index));
  }

  function handleNavLinkChange(
    index: number,
    field: "label" | "href",
    value: string
  ) {
    setNavLinks(
      navLinks.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      )
    );
  }

  return (
    <Page title="Helpdesk Settings" icon={<TbSettings />}>
      <div className="flex gap-8 w-full">
        <div className="flex-1 flex flex-col gap-4">
          <SettingsSection
            id="helpdesk-settings"
            title="Helpdesk Settings"
            description="Configure the helpdesk appearance and navigation"
            fetcher={settingsFetcher}
            actionRight={
              <button className="btn" type="button" onClick={handleAddNavLink}>
                Add
                <TbPlus />
              </button>
            }
          >
            <input
              type="hidden"
              name="enabled"
              value={enabled ? "true" : "false"}
            />
            <input type="hidden" name="heroBg" value={heroBg ?? ""} />
            <input type="hidden" name="logo" value={logo ?? ""} />
            <input type="hidden" name="heroTitle" value={heroTitle ?? ""} />
            <input
              type="hidden"
              name="searchPlaceholder"
              value={searchPlaceholder ?? ""}
            />
            <input
              type="hidden"
              name="navLinks"
              value={JSON.stringify(navLinks)}
            />
            <div className="flex flex-col gap-4">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Enabled</legend>
                <label className="label">
                  <input
                    type="checkbox"
                    className="toggle"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                  Enable helpdesk
                </label>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">
                  Hero Background Color
                </legend>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    className="input"
                    value={heroBg ?? ""}
                    onChange={(e) => setHeroBg(e.target.value)}
                  />
                  <input
                    type="text"
                    className="input flex-1"
                    value={heroBg ?? ""}
                    onChange={(e) => setHeroBg(e.target.value)}
                    placeholder="#7F0E87"
                  />
                </div>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Logo URL</legend>
                <input
                  type="text"
                  className="input w-full"
                  value={logo ?? ""}
                  onChange={(e) => setLogo(e.target.value)}
                  placeholder="https://crawlchat.app/logo-white.png"
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Hero Title</legend>
                <input
                  type="text"
                  className="input w-full"
                  value={heroTitle ?? ""}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  placeholder="Ask about CrawlChat here"
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Search Placeholder</legend>
                <input
                  type="text"
                  className="input w-full"
                  value={searchPlaceholder ?? ""}
                  onChange={(e) => setSearchPlaceholder(e.target.value)}
                  placeholder="Ask your question here"
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Navigation Links</legend>
                <div className="flex flex-col gap-2">
                  {navLinks.map((link, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <fieldset className="fieldset flex-1">
                        <legend className="fieldset-legend">Label</legend>
                        <input
                          type="text"
                          className="input"
                          value={link.label}
                          onChange={(e) =>
                            handleNavLinkChange(index, "label", e.target.value)
                          }
                          placeholder="Website"
                        />
                      </fieldset>
                      <fieldset className="fieldset flex-2">
                        <legend className="fieldset-legend">URL</legend>
                        <input
                          type="text"
                          className="input w-full"
                          value={link.href}
                          onChange={(e) =>
                            handleNavLinkChange(index, "href", e.target.value)
                          }
                          placeholder="https://crawlchat.app"
                        />
                      </fieldset>
                      <fieldset className="fieldset">
                        <button
                          className="btn btn-error btn-soft btn-square"
                          type="button"
                          onClick={() => handleRemoveNavLink(index)}
                        >
                          <TbTrash />
                        </button>
                      </fieldset>
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>
          </SettingsSection>
        </div>

        <div className="w-[600px] sticky top-[76px] h-[calc(100vh-100px)] hidden lg:block">
          <div
            className={cn(
              "border border-base-300 rounded-box overflow-auto",
              "bg-base-100 shadow-lg"
            )}
            style={{ height: "calc(100% - 2rem)" }}
          >
            <Helpdesk
              scrape={loaderData.scrape}
              thread={null}
              messages={[]}
              userToken={loaderData.userToken}
              config={previewConfig}
            >
              <div className="text-center">
                Your guides and other content will appear here.
              </div>
            </Helpdesk>
          </div>
        </div>
      </div>
    </Page>
  );
}

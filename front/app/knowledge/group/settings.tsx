import type { Route } from "./+types/settings";
import type {
  KnowledgeGroupUpdateFrequency,
  Prisma,
  KnowledgeGroup,
} from "libs/prisma";
import { prisma } from "libs/prisma";
import { getNextUpdateTime } from "libs/knowledge-group";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/settings-section";
import { useEffect, useMemo, useState } from "react";
import { redirect, useFetcher } from "react-router";
import { GroupStatus } from "./status";
import { TbTrash } from "react-icons/tb";
import { createToken } from "libs/jwt";
import { MultiSelect, type SelectValue } from "~/components/multi-select";
import { Client } from "@notionhq/client";
import { DataList } from "~/components/data-list";
import { Select } from "~/components/select";
import moment from "moment";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const scrape = await prisma.scrape.findUnique({
    where: { id: scrapeId },
  });

  if (!scrape) {
    throw new Response("Not found", { status: 404 });
  }

  const knowledgeGroup = await prisma.knowledgeGroup.findUnique({
    where: { id: params.groupId },
  });

  if (!knowledgeGroup) {
    throw new Response("Not found", { status: 404 });
  }

  let notionPages: Array<SelectValue> = [];
  if (knowledgeGroup.type === "notion" && knowledgeGroup.notionSecret) {
    const notion = new Client({
      auth: knowledgeGroup.notionSecret,
    });
    const search = await notion.search({
      query: "",
      sort: {
        direction: "descending",
        timestamp: "last_edited_time",
      },
    });
    notionPages = search.results.map((result) => {
      const title = (result as any).properties?.title?.title?.[0]?.plain_text;
      return { title, value: result.id };
    });
  }

  return { scrape, knowledgeGroup, notionPages };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const groupId = params.groupId;

  if (request.method === "DELETE") {
    const token = createToken(user!.id);
    await fetch(`${process.env.VITE_SERVER_URL}/knowledge-group`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        knowledgeGroupId: groupId,
      }),
    });

    return redirect("/knowledge");
  }

  const formData = await request.formData();

  const update: Prisma.KnowledgeGroupUpdateInput = {};

  if (formData.has("from-match-prefix")) {
    update.matchPrefix = formData.get("matchPrefix") === "on";
  }
  if (formData.has("removeHtmlTags")) {
    update.removeHtmlTags = formData.get("removeHtmlTags") as string;
  }
  if (formData.has("skipPageRegex")) {
    update.skipPageRegex = formData.get("skipPageRegex") as string;
  }
  if (formData.has("githubBranch")) {
    update.githubBranch = formData.get("githubBranch") as string;
  }
  if (formData.has("scrollSelector")) {
    update.scrollSelector = formData.get("scrollSelector") as string;
  }
  if (formData.has("updateFrequency")) {
    update.updateFrequency = formData.get(
      "updateFrequency"
    ) as KnowledgeGroupUpdateFrequency;
    update.nextUpdateAt = getNextUpdateTime(update.updateFrequency, new Date());
  }
  if (formData.has("itemContext")) {
    update.itemContext = formData.get("itemContext") as string;
  }

  const group = await prisma.knowledgeGroup.update({
    where: { id: groupId, scrapeId },
    data: update,
  });

  return group;
}

function AutoUpdateSettings({ group }: { group: KnowledgeGroup }) {
  const fetcher = useFetcher();
  const autoUpdateCollection = useMemo(() => {
    return [
      {
        label: "Never",
        value: "never",
      },
      {
        label: "Every hour",
        value: "hourly",
      },
      {
        label: "Every day",
        value: "daily",
      },
      {
        label: "Every week",
        value: "weekly",
      },
      {
        label: "Every month",
        value: "monthly",
      },
    ];
  }, []);

  return (
    <SettingsSection
      id="auto-update"
      fetcher={fetcher}
      title="Auto update"
      description="If enabled, the knowledge group will be updated automatically every day at the specified time."
    >
      <Select
        label="Select frequency"
        options={autoUpdateCollection}
        defaultValue={group.updateFrequency ?? undefined}
        name="updateFrequency"
      />
      {group.nextUpdateAt && (
        <div className="text-sm flex items-center">
          Next update at{" "}
          <span className="badge badge-neutral ml-2">
            {moment(group.nextUpdateAt).format("DD/MM/YYYY HH:mm")}
          </span>
        </div>
      )}
    </SettingsSection>
  );
}

function SkipPagesRegex({
  group,
  pages,
  placeholder,
}: {
  group: KnowledgeGroup;
  pages?: Array<SelectValue>;
  placeholder?: string;
}) {
  const fetcher = useFetcher();
  const [values, setValues] = useState<string[]>(
    group.skipPageRegex?.split(",").filter(Boolean) ?? []
  );
  const valueString = useMemo(() => {
    return values.join(",");
  }, [values]);

  return (
    <SettingsSection
      id="skip-pages-regex"
      fetcher={fetcher}
      title="Skip pages"
      description="Specify the regex of the URLs that you don't want it to scrape. You can give multiple regexes."
    >
      <input value={valueString} name="skipPageRegex" type="hidden" />
      <MultiSelect
        value={values}
        onChange={setValues}
        placeholder={placeholder ?? "Ex: /admin, /dashboard"}
        selectValues={pages}
      />
    </SettingsSection>
  );
}

function WebSettings({ group }: { group: KnowledgeGroup }) {
  const matchPrefixFetcher = useFetcher();
  const htmlTagsToRemoveFetcher = useFetcher();
  const skipRegexFetcher = useFetcher();
  const scrollSelectorFetcher = useFetcher();

  const itemContextFetcher = useFetcher();
  const details = useMemo(() => {
    return [
      {
        label: "URL",
        value: group.url,
      },
      {
        label: "Updated at",
        value: moment(group.updatedAt).format("DD/MM/YYYY HH:mm"),
      },
      {
        label: "Status",
        value: <GroupStatus status={group.status} />,
      },
    ];
  }, [group]);

  return (
    <div className="flex flex-col gap-6">
      <DataList data={details} />

      <SettingsSection
        id="match-prefix"
        fetcher={matchPrefixFetcher}
        title="Match prefix"
        description="If enabled, it scrapes only the pages whose prefix is the same as the group URL"
      >
        <input type="hidden" name="from-match-prefix" value={"true"} />
        <label className="label">
          <input
            type="checkbox"
            name="matchPrefix"
            defaultChecked={group.matchPrefix ?? false}
            className="toggle"
          />
          Active
        </label>
      </SettingsSection>

      <SettingsSection
        id="html-tags-to-remove"
        fetcher={htmlTagsToRemoveFetcher}
        title="HTML tags to remove"
        description="You can specify the HTML selectors whose content is not added to the document. It is recommended to use this to remove junk content such as side menus, headers, footers, etc. You can give multiple selectors comma separated."
      >
        <input
          placeholder="Ex: #sidebar, #header, #footer"
          defaultValue={group.removeHtmlTags ?? ""}
          name="removeHtmlTags"
          className="input"
        />
      </SettingsSection>

      <SkipPagesRegex group={group} />

      <AutoUpdateSettings group={group} />

      <SettingsSection
        id="item-context"
        fetcher={itemContextFetcher}
        title="Item context"
        description="Pass context for the group knowledge. Usefule to segregate the data between types. Example: v1, v2, node, bun, etc."
      >
        <input
          name="itemContext"
          defaultValue={group.itemContext ?? ""}
          placeholder="Ex: v1, v2, node, bun, etc."
          className="input"
        />
        <div className="text-sm text-base-content/50">
          This requires re-fetching the knowledge group.
        </div>
      </SettingsSection>

      <SettingsSection
        id="scroll-selector"
        fetcher={scrollSelectorFetcher}
        title="Scroll selector"
        description="Specify the selector of the element to scroll to. It is useful to scrape pages that have infinite scroll."
      >
        <input
          placeholder="Ex: #panel"
          className="input"
          defaultValue={group.scrollSelector ?? ""}
          name="scrollSelector"
        />
      </SettingsSection>
    </div>
  );
}

function GithubIssuesSettings({ group }: { group: KnowledgeGroup }) {
  const details = useMemo(() => {
    return [
      {
        label: "Repo",
        value: group.githubUrl,
      },
      {
        label: "Updated at",
        value: moment(group.updatedAt).format("DD/MM/YYYY HH:mm"),
      },
      {
        label: "Status",
        value: <GroupStatus status={group.status} />,
      },
    ];
  }, [group]);

  return <DataList data={details} />;
}

function NotionSettings({
  group,
  notionPages,
}: {
  group: KnowledgeGroup;
  notionPages: Array<SelectValue>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <SkipPagesRegex
        group={group}
        pages={notionPages}
        placeholder="Select pages to skip"
      />

      <AutoUpdateSettings group={group} />
    </div>
  );
}

export default function KnowledgeGroupSettings({
  loaderData,
}: Route.ComponentProps) {
  const deleteFetcher = useFetcher();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (deleteConfirm) {
      setTimeout(() => {
        setDeleteConfirm(false);
      }, 5000);
    }
  }, [deleteConfirm]);

  function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    deleteFetcher.submit(null, {
      method: "delete",
    });
  }

  return (
    <SettingsSectionProvider>
      <SettingsContainer>
        {loaderData.knowledgeGroup.type === "scrape_web" && (
          <WebSettings group={loaderData.knowledgeGroup} />
        )}
        {loaderData.knowledgeGroup.type === "github_issues" && (
          <GithubIssuesSettings group={loaderData.knowledgeGroup} />
        )}
        {loaderData.knowledgeGroup.type === "notion" && (
          <NotionSettings
            group={loaderData.knowledgeGroup}
            notionPages={loaderData.notionPages}
          />
        )}

        <SettingsSection
          id="delete-knowledge-group"
          title="Delete group"
          description="This will delete the knowledge group and all the data that is associated with it. This is not reversible."
          danger
          actionRight={
            <button
              className="btn btn-error"
              onClick={handleDelete}
              disabled={deleteFetcher.state !== "idle"}
            >
              {deleteFetcher.state !== "idle" && (
                <span className="loading loading-spinner loading-xs" />
              )}
              {deleteConfirm ? "Sure to delete?" : "Delete"}
              <TbTrash />
            </button>
          }
        />
      </SettingsContainer>
    </SettingsSectionProvider>
  );
}

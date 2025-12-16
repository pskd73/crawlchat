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
import { TbEraser, TbTrash } from "react-icons/tb";
import { createToken } from "libs/jwt";
import { MultiSelect, type SelectValue } from "~/components/multi-select";
import { Client } from "@notionhq/client";
import { DataList } from "~/components/data-list";
import { Select } from "~/components/select";
import { getConfluencePages } from "libs/confluence";
import {
  getLinearIssueStatuses,
  getLinearProjectStatuses,
  LinearClient,
} from "libs/linear";
import moment from "moment";

function getNotionPageTitle(page: any): string | undefined {
  if (!page.properties) {
    return undefined;
  }

  for (const key in page.properties) {
    const prop = page.properties[key];
    if (prop.type === "title" && prop.title?.length > 0) {
      return prop.title.map((t: any) => t.plain_text).join("");
    }
  }
  return undefined;
}

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
    notionPages = search.results.map((result: any) => {
      const title = getNotionPageTitle(result) || "Untitled";
      return { title, value: result.id };
    });
  }

  let confluencePages: Array<SelectValue> = [];
  if (
    knowledgeGroup.type === "confluence" &&
    knowledgeGroup.confluenceApiKey &&
    knowledgeGroup.confluenceEmail &&
    knowledgeGroup.confluenceHost
  ) {
    const pages = await getConfluencePages({
      apiKey: knowledgeGroup.confluenceApiKey,
      email: knowledgeGroup.confluenceEmail,
      host: knowledgeGroup.confluenceHost,
    });
    confluencePages = pages.map((page) => ({
      title: page.title,
      value: page.id,
    }));
  }

  let linearIssueStatuses: Array<SelectValue> = [];
  let linearProjectStatuses: Array<SelectValue> = [];
  if (knowledgeGroup.type === "linear" && knowledgeGroup.linearApiKey) {
    const client = new LinearClient({
      apiKey: knowledgeGroup.linearApiKey,
    });

    const issueStatuses = await getLinearIssueStatuses(client);
    linearIssueStatuses = issueStatuses.map((status) => ({
      title: status.name,
      value: status.id,
    }));

    const projectStatuses = await getLinearProjectStatuses(client);
    linearProjectStatuses = projectStatuses.map((status) => ({
      title: status.name,
      value: status.id,
    }));
  }

  return {
    scrape,
    knowledgeGroup,
    notionPages,
    confluencePages,
    linearIssueStatuses,
    linearProjectStatuses,
  };
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

  const intent = formData.get("intent");
  if (intent === "clear-pages") {
    const token = createToken(user!.id);
    await fetch(`${process.env.VITE_SERVER_URL}/knowledge-group`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        knowledgeGroupId: groupId,
        clear: true,
      }),
    });
    return { success: true };
  }

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
  if (formData.has("linearSkipIssueStatuses")) {
    update.linearSkipIssueStatuses = formData.get(
      "linearSkipIssueStatuses"
    ) as string;
  }
  if (formData.has("linearSkipProjectStatuses")) {
    update.linearSkipProjectStatuses = formData.get(
      "linearSkipProjectStatuses"
    ) as string;
  }
  if (formData.has("allowedGithubIssueStates")) {
    update.allowedGithubIssueStates = formData.get(
      "allowedGithubIssueStates"
    ) as string;
  }
  if (formData.has("youtubeUrls")) {
    const urlsString = formData.get("youtubeUrls") as string;
    const urls = urlsString
      .split(",")
      .filter(Boolean)
      .map((url) => ({ url: url.trim() }));
    update.urls = urls;
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
    const allOptions = [
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

    if (group.type === "youtube_channel") {
      return allOptions.filter(
        (option) => option.value !== "hourly" && option.value !== "daily"
      );
    }

    return allOptions;
  }, [group.type]);

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
  const allowedStatesFetcher = useFetcher();
  const [allowedStates, setAllowedStates] = useState<string[]>(
    group.allowedGithubIssueStates?.split(",").filter(Boolean) ?? []
  );
  const allowedStatesString = useMemo(() => {
    return allowedStates.join(",");
  }, [allowedStates]);

  const stateOptions: Array<SelectValue> = [
    { title: "Open", value: "open" },
    { title: "Closed", value: "closed" },
  ];

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

  return (
    <div className="flex flex-col gap-6">
      <DataList data={details} />
      <SettingsSection
        id="allowed-github-issue-states"
        fetcher={allowedStatesFetcher}
        title="Allowed issue states"
        description="Select the states of issues to fetch. You can select multiple states. Default it fetches all closed issues."
      >
        <input
          value={allowedStatesString}
          name="allowedGithubIssueStates"
          type="hidden"
        />
        <MultiSelect
          value={allowedStates}
          onChange={setAllowedStates}
          placeholder="Select states to fetch"
          selectValues={stateOptions}
        />
      </SettingsSection>
    </div>
  );
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

function ConfluenceSettings({
  group,
  confluencePages,
}: {
  group: KnowledgeGroup;
  confluencePages: Array<SelectValue>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <SkipPagesRegex
        group={group}
        pages={confluencePages}
        placeholder="Select pages to skip"
      />

      <AutoUpdateSettings group={group} />
    </div>
  );
}

function LinearSettings({
  group,
  linearIssueStatuses,
  linearProjectStatuses,
}: {
  group: KnowledgeGroup;
  linearIssueStatuses: Array<SelectValue>;
  linearProjectStatuses: Array<SelectValue>;
}) {
  const skipIssueStatusesFetcher = useFetcher();
  const skipProjectStatusesFetcher = useFetcher();

  const [skipIssueStatuses, setSkipIssueStatuses] = useState<string[]>(
    group.linearSkipIssueStatuses?.split(",").filter(Boolean) ?? []
  );
  const [skipProjectStatuses, setSkipProjectStatuses] = useState<string[]>(
    group.linearSkipProjectStatuses?.split(",").filter(Boolean) ?? []
  );
  const skipIssueStatusesString = useMemo(() => {
    return skipIssueStatuses.join(",");
  }, [skipIssueStatuses]);
  const skipProjectStatusesString = useMemo(() => {
    return skipProjectStatuses.join(",");
  }, [skipProjectStatuses]);

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        id="linear-skip-issue-statuses"
        fetcher={skipIssueStatusesFetcher}
        title="Skip issue statuses"
        description="Specify the statuses of the issues that you don't want it to scrape. You can give multiple statuses."
      >
        <input
          value={skipIssueStatusesString}
          name="linearSkipIssueStatuses"
          type="hidden"
        />
        <MultiSelect
          value={skipIssueStatuses}
          onChange={setSkipIssueStatuses}
          placeholder="Select statuses to skip"
          selectValues={linearIssueStatuses}
        />
      </SettingsSection>

      <SettingsSection
        id="linear-skip-project-statuses"
        fetcher={skipProjectStatusesFetcher}
        title="Skip project statuses"
        description="Specify the statuses of the projects that you don't want it to scrape. You can give multiple statuses."
      >
        <input
          value={skipProjectStatusesString}
          name="linearSkipProjectStatuses"
          type="hidden"
        />
        <MultiSelect
          value={skipProjectStatuses}
          onChange={setSkipProjectStatuses}
          placeholder="Select statuses to skip"
          selectValues={linearProjectStatuses}
        />
      </SettingsSection>

      <AutoUpdateSettings group={group} />
    </div>
  );
}

function YouTubeSettings({ group }: { group: KnowledgeGroup }) {
  const youtubeUrlsFetcher = useFetcher();
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>(
    group.urls?.map((item) => item.url).filter(Boolean) ?? []
  );
  const youtubeUrlsString = useMemo(() => {
    return youtubeUrls.join(",");
  }, [youtubeUrls]);

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        id="youtube-urls"
        fetcher={youtubeUrlsFetcher}
        title="YouTube Video URLs"
        description="Add multiple YouTube video URLs to extract transcripts from. Each URL will be processed and added to your knowledge base."
      >
        <input value={youtubeUrlsString} name="youtubeUrls" type="hidden" />
        <MultiSelect
          value={youtubeUrls}
          onChange={setYoutubeUrls}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </SettingsSection>

      <AutoUpdateSettings group={group} />
    </div>
  );
}

function YouTubeChannelSettings({ group }: { group: KnowledgeGroup }) {
  const skipUrlsFetcher = useFetcher();
  const [skipUrls, setSkipUrls] = useState<string[]>(
    group.skipPageRegex?.split(",").filter(Boolean) ?? []
  );
  const skipUrlsString = useMemo(() => {
    return skipUrls.join(",");
  }, [skipUrls]);

  return (
    <>
      <SettingsSection
        id="skip-urls"
        fetcher={skipUrlsFetcher}
        title="Skip URLs"
        description="Specify regex patterns to skip certain videos. Videos matching any of these patterns will be excluded. You can match against video URLs, IDs, or titles."
      >
        <input value={skipUrlsString} name="skipPageRegex" type="hidden" />
        <MultiSelect
          value={skipUrls}
          onChange={setSkipUrls}
          placeholder="Ex: /watch\\?v=.*, /shorts/.*"
        />
      </SettingsSection>

      <AutoUpdateSettings group={group} />
    </>
  );
}

export default function KnowledgeGroupSettings({
  loaderData,
}: Route.ComponentProps) {
  const deleteFetcher = useFetcher();
  const clearPagesFetcher = useFetcher();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [clearPagesConfirm, setClearPagesConfirm] = useState(false);

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

  function handleClearPages() {
    if (!clearPagesConfirm) {
      return setClearPagesConfirm(true);
    }

    clearPagesFetcher.submit(
      { intent: "clear-pages" },
      {
        method: "post",
      }
    );
    setClearPagesConfirm(false);
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
        {loaderData.knowledgeGroup.type === "confluence" && (
          <ConfluenceSettings
            group={loaderData.knowledgeGroup}
            confluencePages={loaderData.confluencePages}
          />
        )}
        {loaderData.knowledgeGroup.type === "linear" && (
          <LinearSettings
            group={loaderData.knowledgeGroup}
            linearIssueStatuses={loaderData.linearIssueStatuses}
            linearProjectStatuses={loaderData.linearProjectStatuses}
          />
        )}
        {loaderData.knowledgeGroup.type === "youtube" && (
          <YouTubeSettings group={loaderData.knowledgeGroup} />
        )}
        {loaderData.knowledgeGroup.type === "youtube_channel" && (
          <YouTubeChannelSettings group={loaderData.knowledgeGroup} />
        )}

        <SettingsSection
          id="clear-pages"
          title="Clear pages"
          description="This will clear the all the pages of the knowledge group."
          danger
          actionRight={
            <button
              className="btn btn-error"
              onClick={handleClearPages}
              disabled={clearPagesFetcher.state !== "idle"}
            >
              {clearPagesFetcher.state !== "idle" && (
                <span className="loading loading-spinner loading-xs" />
              )}
              {clearPagesConfirm ? "Sure to clear?" : "Clear"}
              <TbEraser />
            </button>
          }
        />

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

import type { Route } from "./+types/settings";
import type {
  KnowledgeGroupUpdateFrequency,
  Prisma,
  KnowledgeGroup,
  GithubIssuesType,
} from "@packages/common/prisma";
import { prisma } from "@packages/common/prisma";
import { getNextUpdateTime } from "@packages/common/knowledge-group";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/components/settings-section";
import { useEffect, useMemo, useRef, useState } from "react";
import { redirect, useFetcher } from "react-router";
import { GroupStatus } from "./status";
import { TbEraser, TbTrash } from "react-icons/tb";
import { createToken } from "@packages/common/jwt";
import { MultiSelect, type SelectValue } from "~/components/multi-select";
import { Client } from "@notionhq/client";
import { DataList } from "~/components/data-list";
import { getConfluencePages } from "@packages/common/confluence";
import {
  getLinearIssueStatuses,
  getLinearProjectStatuses,
  LinearClient,
} from "@packages/common/linear";
import { Timestamp } from "~/components/timestamp";
import type { FileUpload } from "@mjackson/form-data-parser";
import { parseFormData } from "@mjackson/form-data-parser";
import { v4 as uuidv4 } from "uuid";
import { useFetcherToast } from "~/components/use-fetcher-toast";
import { useDirtyForm } from "~/components/use-dirty-form";

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
  if (
    (knowledgeGroup.type === "linear" ||
      knowledgeGroup.type === "linear_projects") &&
    knowledgeGroup.linearApiKey
  ) {
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

  const contentType = request.headers.get("content-type") || "";
  const isMultipart = contentType.includes("multipart/form-data");

  if (isMultipart) {
    const fileMarkdowns: { markdown: string; title: string }[] = [];

    const uploadHandler = async (fileUpload: FileUpload) => {
      const arrayBuffer = await fileUpload.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");

      const response = await fetch(`${process.env.MARKER_HOST}/mark`, {
        method: "POST",
        body: JSON.stringify({
          base64,
        }),
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.MARKER_API_KEY as string,
        },
      });

      const data = await response.json();
      fileMarkdowns.push({ markdown: data.markdown, title: fileUpload.name });
    };

    const formData = await parseFormData(request, uploadHandler);
    const intent = formData.get("intent") as string;

    if (intent === "upload-files") {
      const group = await prisma.knowledgeGroup.findUnique({
        where: { id: groupId },
        include: {
          scrape: true,
        },
      });

      if (!group || group.type !== "upload") {
        return Response.json({ error: "Invalid group" }, { status: 400 });
      }

      if (fileMarkdowns.length > 0) {
        await fetch(`${process.env.VITE_SERVER_URL}/page/${group.scrape.id}`, {
          method: "POST",
          body: JSON.stringify({
            knowledgeGroupType: "upload",
            defaultGroupTitle: "Upload",
            knowledgeGroupId: group.id,
            pages: fileMarkdowns.map((file) => ({
              title: file.title,
              text: file.markdown,
              pageId: `default-${uuidv4()}`,
            })),
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${createToken(user!.id)}`,
          },
        });
      }

      return { success: true };
    }

    return Response.json(
      { error: "Invalid intent for multipart request" },
      { status: 400 }
    );
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
  if (formData.has("from-include-404")) {
    update.include404 = formData.get("include404") === "on";
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
  if (formData.has("onlyAnsweredDiscussions")) {
    (update as any).onlyAnsweredDiscussions =
      formData.get("onlyAnsweredDiscussions") === "on";
  }
  if (formData.has("youtubeUrls")) {
    const urlsString = formData.get("youtubeUrls") as string;
    const urls = urlsString
      .split(",")
      .filter(Boolean)
      .map((url) => ({ url: url.trim() }));
    update.urls = urls;
  }
  if (formData.has("from-load-dynamically")) {
    update.loadDynamically = formData.get("loadDynamically") === "on";
  }
  if (formData.has("from-remove-stale-pages")) {
    update.removeStalePages = formData.get("removeStalePages") === "on";
  }
  if (formData.has("githubIssuesType")) {
    update.githubIssuesType = formData.get(
      "githubIssuesType"
    ) as GithubIssuesType;
  }

  const group = await prisma.knowledgeGroup.update({
    where: { id: groupId, scrapeId },
    data: update,
  });

  return group;
}

function AutoUpdateSettings({ group }: { group: KnowledgeGroup }) {
  const fetcher = useFetcher();
  const dirtyForm = useDirtyForm({
    updateFrequency: group.updateFrequency ?? undefined,
  });
  const autoUpdateCollection = useMemo(() => {
    const allOptions = [
      { label: "Never", value: "never" },
      { label: "Every hour", value: "hourly" },
      { label: "Every day", value: "daily" },
      { label: "Every week", value: "weekly" },
      { label: "Every month", value: "monthly" },
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
      dirty={dirtyForm.isDirty("updateFrequency")}
    >
      <select
        className="select"
        name="updateFrequency"
        value={dirtyForm.getValue("updateFrequency") ?? ""}
        onChange={dirtyForm.handleChange("updateFrequency")}
      >
        {autoUpdateCollection.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {group.nextUpdateAt && (
        <div className="text-sm flex items-center">
          Next update at{" "}
          <span className="badge badge-neutral ml-2">
            <Timestamp date={group.nextUpdateAt} />
          </span>
        </div>
      )}
    </SettingsSection>
  );
}

function RemoveStalePagesSettings({ group }: { group: KnowledgeGroup }) {
  const fetcher = useFetcher();
  const dirtyForm = useDirtyForm({
    removeStalePages: group.removeStalePages ?? false,
  });

  return (
    <SettingsSection
      id="remove-stale-pages"
      fetcher={fetcher}
      title="Remove stale pages"
      description="If enabled, pages that are no longer found in the source will be automatically removed after each sync."
      dirty={dirtyForm.isDirty("removeStalePages")}
    >
      <input type="hidden" name="from-remove-stale-pages" value={"true"} />
      <label className="label">
        <input
          type="checkbox"
          name="removeStalePages"
          checked={dirtyForm.getValue("removeStalePages") ?? false}
          onChange={dirtyForm.handleChange("removeStalePages")}
          className="toggle"
        />
        Active
      </label>
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
  const dirtyForm = useDirtyForm({
    skipPageRegex: group.skipPageRegex?.split(",").filter(Boolean) ?? [],
  });
  const valueString = useMemo(
    () => dirtyForm.getValue("skipPageRegex")?.join(",") ?? "",
    [dirtyForm.values]
  );

  return (
    <SettingsSection
      id="skip-pages-regex"
      fetcher={fetcher}
      title="Skip pages"
      description="Specify the regex of the URLs that you don't want it to scrape. You can give multiple regexes."
      dirty={dirtyForm.isDirty("skipPageRegex")}
    >
      <input value={valueString} name="skipPageRegex" type="hidden" />
      <MultiSelect
        value={dirtyForm.getValue("skipPageRegex") ?? []}
        onChange={(v) => dirtyForm.setValue("skipPageRegex", v)}
        placeholder={placeholder ?? "Ex: /admin, /dashboard"}
        selectValues={pages}
      />
    </SettingsSection>
  );
}

function WebSettings({ group }: { group: KnowledgeGroup }) {
  const matchPrefixFetcher = useFetcher();
  const htmlTagsToRemoveFetcher = useFetcher();
  const include404Pages = useFetcher();
  const scrollSelectorFetcher = useFetcher();
  const loadDynamicallyFetcher = useFetcher();
  const itemContextFetcher = useFetcher();

  const form = useDirtyForm({
    matchPrefix: group.matchPrefix ?? false,
    include404: group.include404 ?? false,
    removeHtmlTags: group.removeHtmlTags ?? "",
    itemContext: group.itemContext ?? "",
    scrollSelector: group.scrollSelector ?? "",
    loadDynamically: group.loadDynamically ?? false,
  });

  const details = useMemo(() => {
    return [
      {
        label: "URL",
        value: group.url,
      },
      {
        label: "Updated at",
        value: <Timestamp date={group.updatedAt} />,
      },
      {
        label: "Status",
        value: <GroupStatus status={group.status} />,
      },
    ];
  }, [group]);

  return (
    <div className="flex flex-col gap-4">
      <DataList data={details} />

      <SettingsSection
        id="match-prefix"
        fetcher={matchPrefixFetcher}
        title="Match prefix"
        description="If enabled, it scrapes only the pages whose prefix is the same as the group URL"
        dirty={form.isDirty("matchPrefix")}
      >
        <input type="hidden" name="from-match-prefix" value={"true"} />
        <label className="label">
          <input
            type="checkbox"
            name="matchPrefix"
            checked={(form.getValue("matchPrefix") as boolean) ?? false}
            onChange={form.handleChange("matchPrefix")}
            className="toggle"
          />
          Active
        </label>
      </SettingsSection>

      <SettingsSection
        id="include-404-pages"
        fetcher={include404Pages}
        title="Include 404 pages"
        description="If disabled, it will not upsert the pages which respond with 404 not found."
        dirty={form.isDirty("include404")}
      >
        <input type="hidden" name="from-include-404" value={"true"} />
        <label className="label">
          <input
            type="checkbox"
            name="include404"
            checked={(form.getValue("include404") as boolean) ?? false}
            onChange={form.handleChange("include404")}
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
        dirty={form.isDirty("removeHtmlTags")}
      >
        <input
          placeholder="Ex: #sidebar, #header, #footer"
          value={(form.getValue("removeHtmlTags") as string) ?? ""}
          onChange={form.handleChange("removeHtmlTags")}
          name="removeHtmlTags"
          className="input"
        />
      </SettingsSection>

      <SkipPagesRegex group={group} />

      <AutoUpdateSettings group={group} />
      <RemoveStalePagesSettings group={group} />

      <SettingsSection
        id="item-context"
        fetcher={itemContextFetcher}
        title="Item context"
        description="Pass context for the group knowledge. Usefule to segregate the data between types. Example: v1, v2, node, bun, etc."
        dirty={form.isDirty("itemContext")}
      >
        <input
          name="itemContext"
          value={(form.getValue("itemContext") as string) ?? ""}
          onChange={form.handleChange("itemContext")}
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
        dirty={form.isDirty("scrollSelector")}
      >
        <input
          placeholder="Ex: #panel"
          className="input"
          value={(form.getValue("scrollSelector") as string) ?? ""}
          onChange={form.handleChange("scrollSelector")}
          name="scrollSelector"
        />
      </SettingsSection>

      <SettingsSection
        id="load-dynamically"
        fetcher={loadDynamicallyFetcher}
        title="Load dynamically"
        description="If enabled, it will load the page dynamically. It is useful to scrape pages that have infinite scroll."
        dirty={form.isDirty("loadDynamically")}
      >
        <input type="hidden" name="from-load-dynamically" value={"true"} />
        <label className="label">
          <input
            type="checkbox"
            name="loadDynamically"
            checked={(form.getValue("loadDynamically") as boolean) ?? false}
            onChange={form.handleChange("loadDynamically")}
            className="toggle"
          />
          Active
        </label>
      </SettingsSection>
    </div>
  );
}

function GithubIssuesSettings({ group }: { group: KnowledgeGroup }) {
  const allowedStatesFetcher = useFetcher();
  const githubIssuesTypeFetcher = useFetcher();
  const form = useDirtyForm({
    allowedGithubIssueStates:
      group.allowedGithubIssueStates?.split(",").filter(Boolean) ?? [],
    githubIssuesType: group.githubIssuesType ?? "all",
  });
  const allowedStatesString = useMemo(
    () =>
      (form.getValue("allowedGithubIssueStates") as string[])?.join(",") ?? "",
    [form.values]
  );

  const stateOptions: Array<SelectValue> = [
    { title: "Open", value: "open" },
    { title: "Closed", value: "closed" },
  ];

  const details = useMemo(() => {
    return [
      { label: "Repo", value: group.githubUrl },
      { label: "Updated at", value: <Timestamp date={group.updatedAt} /> },
      { label: "Status", value: <GroupStatus status={group.status} /> },
    ];
  }, [group]);

  return (
    <div className="flex flex-col gap-4">
      <DataList data={details} />
      <SettingsSection
        id="allowed-github-issue-states"
        fetcher={allowedStatesFetcher}
        title="Allowed issue states"
        description="Select the states of issues to fetch. You can select multiple states. Default it fetches all closed issues."
        dirty={form.isDirty("allowedGithubIssueStates")}
      >
        <input
          value={allowedStatesString}
          name="allowedGithubIssueStates"
          type="hidden"
        />
        <MultiSelect
          value={(form.getValue("allowedGithubIssueStates") as string[]) ?? []}
          onChange={(v) => form.setValue("allowedGithubIssueStates", v)}
          placeholder="Select states to fetch"
          selectValues={stateOptions}
        />
      </SettingsSection>

      <SettingsSection
        id="github-issues-type"
        fetcher={githubIssuesTypeFetcher}
        title="Issues type"
        description="Specify the type of issues to fetch. Either fetch all issues, only issues, or only pull requests."
        dirty={form.isDirty("githubIssuesType")}
      >
        <select
          name="githubIssuesType"
          className="select"
          value={(form.getValue("githubIssuesType") as string) ?? "all"}
          onChange={form.handleChange("githubIssuesType")}
        >
          <option value="all">All</option>
          <option value="only_issues">Only issues</option>
          <option value="only_prs">Only pull requests</option>
        </select>
      </SettingsSection>

      <RemoveStalePagesSettings group={group} />
    </div>
  );
}

function GithubDiscussionsSettings({ group }: { group: KnowledgeGroup }) {
  const onlyAnsweredFetcher = useFetcher();
  const dirtyForm = useDirtyForm({
    onlyAnsweredDiscussions: (group as any).onlyAnsweredDiscussions ?? false,
  });

  const details = useMemo(() => {
    return [
      { label: "Repo", value: group.url },
      { label: "Updated at", value: <Timestamp date={group.updatedAt} /> },
      { label: "Status", value: <GroupStatus status={group.status} /> },
    ];
  }, [group]);

  return (
    <div className="flex flex-col gap-4">
      <DataList data={details} />
      <SettingsSection
        id="only-answered-discussions"
        fetcher={onlyAnsweredFetcher}
        title="Only answered"
        description="If enabled, only fetch discussions that have been marked as answered. By default, all discussions are fetched."
        dirty={dirtyForm.isDirty("onlyAnsweredDiscussions")}
      >
        <input
          type="hidden"
          name="onlyAnsweredDiscussions"
          value={dirtyForm.getValue("onlyAnsweredDiscussions") ? "on" : ""}
        />
        <label className="label cursor-pointer justify-start gap-4">
          <input
            type="checkbox"
            checked={dirtyForm.getValue("onlyAnsweredDiscussions") ?? false}
            onChange={dirtyForm.handleChange("onlyAnsweredDiscussions")}
            className="toggle"
          />
          <span className="label-text">Only fetch answered discussions</span>
        </label>
      </SettingsSection>

      <RemoveStalePagesSettings group={group} />
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
    <div className="flex flex-col gap-4">
      <SkipPagesRegex
        group={group}
        pages={notionPages}
        placeholder="Select pages to skip"
      />

      <AutoUpdateSettings group={group} />
      <RemoveStalePagesSettings group={group} />
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
    <div className="flex flex-col gap-4">
      <SkipPagesRegex
        group={group}
        pages={confluencePages}
        placeholder="Select pages to skip"
      />

      <AutoUpdateSettings group={group} />
      <RemoveStalePagesSettings group={group} />
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
  const dirtyForm = useDirtyForm({
    linearSkipIssueStatuses:
      group.linearSkipIssueStatuses?.split(",").filter(Boolean) ?? [],
    linearSkipProjectStatuses:
      group.linearSkipProjectStatuses?.split(",").filter(Boolean) ?? [],
  });
  const skipIssueStatusesString = useMemo(
    () => dirtyForm.getValue("linearSkipIssueStatuses")?.join(",") ?? "",
    [dirtyForm.values]
  );
  const skipProjectStatusesString = useMemo(
    () => dirtyForm.getValue("linearSkipProjectStatuses")?.join(",") ?? "",
    [dirtyForm.values]
  );

  return (
    <div className="flex flex-col gap-4">
      {group.type === "linear" && (
        <SettingsSection
          id="linear-skip-issue-statuses"
          fetcher={skipIssueStatusesFetcher}
          title="Skip issue statuses"
          description="Specify the statuses of the issues that you don't want it to scrape. You can give multiple statuses."
          dirty={dirtyForm.isDirty("linearSkipIssueStatuses")}
        >
          <input
            value={skipIssueStatusesString}
            name="linearSkipIssueStatuses"
            type="hidden"
          />
          <MultiSelect
            value={dirtyForm.getValue("linearSkipIssueStatuses") ?? []}
            onChange={(v) => dirtyForm.setValue("linearSkipIssueStatuses", v)}
            placeholder="Select statuses to skip"
            selectValues={linearIssueStatuses}
          />
        </SettingsSection>
      )}

      {group.type === "linear_projects" && (
        <SettingsSection
          id="linear-skip-project-statuses"
          fetcher={skipProjectStatusesFetcher}
          title="Skip project statuses"
          description="Specify the statuses of the projects that you don't want it to scrape. You can give multiple statuses."
          dirty={dirtyForm.isDirty("linearSkipProjectStatuses")}
        >
          <input
            value={skipProjectStatusesString}
            name="linearSkipProjectStatuses"
            type="hidden"
          />
          <MultiSelect
            value={dirtyForm.getValue("linearSkipProjectStatuses") ?? []}
            onChange={(v) => dirtyForm.setValue("linearSkipProjectStatuses", v)}
            placeholder="Select statuses to skip"
            selectValues={linearProjectStatuses}
          />
        </SettingsSection>
      )}

      <AutoUpdateSettings group={group} />
      <RemoveStalePagesSettings group={group} />
    </div>
  );
}

function YouTubeSettings({ group }: { group: KnowledgeGroup }) {
  const youtubeUrlsFetcher = useFetcher();
  const dirtyForm = useDirtyForm({
    youtubeUrls: group.urls?.map((item) => item.url).filter(Boolean) ?? [],
  });
  const youtubeUrlsString = useMemo(
    () => dirtyForm.getValue("youtubeUrls")?.join(",") ?? "",
    [dirtyForm.values]
  );

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        id="youtube-urls"
        fetcher={youtubeUrlsFetcher}
        title="YouTube Video URLs"
        description="Add multiple YouTube video URLs to extract transcripts from. Each URL will be processed and added to your knowledge base."
        dirty={dirtyForm.isDirty("youtubeUrls")}
      >
        <input value={youtubeUrlsString} name="youtubeUrls" type="hidden" />
        <MultiSelect
          value={dirtyForm.getValue("youtubeUrls") ?? []}
          onChange={(v) => dirtyForm.setValue("youtubeUrls", v)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </SettingsSection>

      <AutoUpdateSettings group={group} />
      <RemoveStalePagesSettings group={group} />
    </div>
  );
}

function YouTubeChannelSettings({ group }: { group: KnowledgeGroup }) {
  const skipUrlsFetcher = useFetcher();
  const dirtyForm = useDirtyForm({
    skipPageRegex: group.skipPageRegex?.split(",").filter(Boolean) ?? [],
  });
  const skipUrlsString = useMemo(
    () => dirtyForm.getValue("skipPageRegex")?.join(",") ?? "",
    [dirtyForm.values]
  );

  return (
    <>
      <SettingsSection
        id="skip-urls"
        fetcher={skipUrlsFetcher}
        title="Skip URLs"
        description="Specify regex patterns to skip certain videos. Videos matching any of these patterns will be excluded. You can match against video URLs, IDs, or titles."
        dirty={dirtyForm.isDirty("skipPageRegex")}
      >
        <input value={skipUrlsString} name="skipPageRegex" type="hidden" />
        <MultiSelect
          value={dirtyForm.getValue("skipPageRegex") ?? []}
          onChange={(v) => dirtyForm.setValue("skipPageRegex", v)}
          placeholder="Ex: /watch\\?v=.*, /shorts/.*"
        />
      </SettingsSection>

      <AutoUpdateSettings group={group} />
      <RemoveStalePagesSettings group={group} />
    </>
  );
}

function UploadSettings({ group }: { group: KnowledgeGroup }) {
  const uploadFetcher = useFetcher();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useFetcherToast(uploadFetcher, {
    title: "Files added to queue",
  });

  useEffect(() => {
    if (uploadFetcher.data?.success && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [uploadFetcher.state, uploadFetcher.data]);

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        id="upload-files"
        fetcher={uploadFetcher}
        title="Upload files"
        description="Upload additional files to add to this knowledge group. Supported formats: PDF, DOCX, PPTX, TXT, MD, and code files."
        multipart
      >
        <input type="hidden" name="intent" value="upload-files" />
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          className="file-input w-full"
          accept={
            "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown,text/javascript,application/javascript,.tsx,.ts,.js,.jsx,.mdx"
          }
          multiple
        />
      </SettingsSection>
    </div>
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
        {loaderData.knowledgeGroup.type === "github_discussions" && (
          <GithubDiscussionsSettings group={loaderData.knowledgeGroup} />
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
        {(loaderData.knowledgeGroup.type === "linear" ||
          loaderData.knowledgeGroup.type === "linear_projects") && (
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
        {loaderData.knowledgeGroup.type === "upload" && (
          <UploadSettings group={loaderData.knowledgeGroup} />
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

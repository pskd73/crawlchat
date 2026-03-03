import type { FileUpload } from "@mjackson/form-data-parser";
import { parseFormData } from "@mjackson/form-data-parser";
import { Client } from "@notionhq/client";
import { getConfluencePages } from "@packages/common/confluence";
import { createToken } from "@packages/common/jwt";
import { getNextUpdateTime } from "@packages/common/knowledge-group";
import {
  getLinearIssueStatuses,
  getLinearProjectStatuses,
  LinearClient,
} from "@packages/common/linear";
import type {
  GithubIssuesType,
  KnowledgeGroupUpdateFrequency,
  Prisma,
} from "@packages/common/prisma";
import { prisma } from "@packages/common/prisma";
import { useEffect, useMemo, useState } from "react";
import { TbEraser, TbTrash } from "react-icons/tb";
import { redirect, useFetcher } from "react-router";
import { v4 as uuidv4 } from "uuid";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { DataList } from "~/components/data-list";
import type { SelectValue } from "~/components/multi-select";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/components/settings-section";
import { Timestamp } from "~/components/timestamp";
import { getSourceSpec } from "~/source-spec";
import { GroupStatus } from "../status";
import type { Route } from "./+types/page";
import { AutoSyncSettings } from "./auto-sync";
import { GithubDiscussionsSettings } from "./github-discussions";
import { GithubIssuesSettings } from "./github-issues";
import { LinearSettings } from "./linear";
import { RemoveStalePagesSettings } from "./remove-stale-pages";
import { SkipPagesRegex } from "./skip-pages-regex";
import { UploadSettings } from "./upload";
import { WebSettings } from "./web";
import { YouTubeSettings } from "./youtube";

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

export default function KnowledgeGroupSettings({
  loaderData,
}: Route.ComponentProps) {
  const deleteFetcher = useFetcher();
  const clearPagesFetcher = useFetcher();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [clearPagesConfirm, setClearPagesConfirm] = useState(false);

  const sourceSpec = useMemo(
    () =>
      getSourceSpec(
        loaderData.knowledgeGroup.type,
        loaderData.knowledgeGroup.subType
      ),
    [loaderData.knowledgeGroup.type, loaderData.knowledgeGroup.subType]
  );

  const details = useMemo(() => {
    const details: Array<{ label: string; value: React.ReactNode }> = [
      {
        label: "Status",
        value: <GroupStatus status={loaderData.knowledgeGroup.status} />,
      },
      {
        label: "Updated at",
        value: <Timestamp date={loaderData.knowledgeGroup.updatedAt} />,
      },
    ];
    if (sourceSpec?.showUrl && sourceSpec.fields.url) {
      details.push({
        label: sourceSpec.fields.url.name,
        value: loaderData.knowledgeGroup.url ?? "-",
      });
    }
    return details;
  }, [loaderData.knowledgeGroup]);

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
        <DataList data={details} />

        {loaderData.knowledgeGroup.type === "scrape_web" && (
          <WebSettings group={loaderData.knowledgeGroup} />
        )}
        {loaderData.knowledgeGroup.type === "github_issues" && (
          <GithubIssuesSettings group={loaderData.knowledgeGroup} />
        )}
        {loaderData.knowledgeGroup.type === "github_discussions" && (
          <GithubDiscussionsSettings group={loaderData.knowledgeGroup} />
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
        {loaderData.knowledgeGroup.type === "upload" && <UploadSettings />}

        {sourceSpec?.canSkipPages && (
          <SkipPagesRegex group={loaderData.knowledgeGroup} />
        )}

        {sourceSpec?.canClearStalePages && (
          <RemoveStalePagesSettings group={loaderData.knowledgeGroup} />
        )}

        {sourceSpec && sourceSpec.autoSyncIntervals.length > 0 && (
          <AutoSyncSettings
            group={loaderData.knowledgeGroup}
            intervals={sourceSpec?.autoSyncIntervals ?? []}
          />
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

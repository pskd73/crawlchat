import cn from "@meltdownjs/cn";
import type { FileUpload } from "@mjackson/form-data-parser";
import { parseFormData } from "@mjackson/form-data-parser";
import { createToken } from "@packages/common/jwt";
import type {
  KnowledgeGroupStatus,
  KnowledgeGroupType,
} from "@packages/common/prisma";
import { prisma } from "@packages/common/prisma";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { TbBook2, TbCheck } from "react-icons/tb";
import { redirect, useFetcher } from "react-router";
import { v4 as uuidv4 } from "uuid";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { Page } from "~/components/page";
import { RadioCard } from "~/components/radio-card";
import { makeMeta } from "~/meta";
import { getSourceSpec, sourceSpecs } from "~/source-spec";
import type { Route } from "./+types/new-group";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  const scrapes = await prisma.scrape.findMany({
    where: {
      userId: user!.id,
    },
  });

  return {
    token: createToken(user!.id),
    scrapes,
  };
}

export function meta() {
  return makeMeta({
    title: "New knowledge group - CrawlChat",
  });
}

export async function action({ request }: { request: Request }) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

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

  const scrape = await prisma.scrape.findUniqueOrThrow({
    where: { id: scrapeId as string },
  });

  if (request.method === "POST") {
    const rawType = formData.get("type") as string;
    const [type, subType] = rawType.split(":");
    const sourceSpec = getSourceSpec(type as KnowledgeGroupType, subType);
    if (!sourceSpec) {
      return { error: "Invalid source type" };
    }

    const rawUrl = formData.get("url") as string;
    if (sourceSpec.fields.url?.required && !rawUrl) {
      return { error: sourceSpec.fields.url.name + " is required" };
    }

    const skipPageRegex =
      subType === "docusaurus"
        ? "/docs/[0-9x]+\.[0-9x]+\.[0-9x]+,/docs/next"
        : undefined;
    const status: KnowledgeGroupStatus = sourceSpec.canSync
      ? "pending"
      : "done";
    const url = type === "youtube" ? undefined : rawUrl;
    const urls = type === "youtube" && rawUrl ? [{ url: rawUrl }] : undefined;

    const group = await prisma.knowledgeGroup.create({
      data: {
        scrapeId: scrape.id,
        userId: user!.id,
        type: type as KnowledgeGroupType,
        status,
        title: formData.get("title") as string,

        url,
        urls,
        matchPrefix: true,
        removeHtmlTags: "nav,aside,footer,header,.theme-announcement-bar",
        maxPages: 5000,
        staticContentThresholdLength: 100,

        skipPageRegex,
        subType,

        notionSecret: formData.get("notionSecret") as string,
        confluenceApiKey: formData.get("confluenceApiKey") as string,
        confluenceEmail: formData.get("confluenceEmail") as string,
        confluenceHost: formData.get("confluenceHost") as string,
        linearApiKey: formData.get("linearApiKey") as string,
        githubBranch: formData.get("githubBranch") as string,
      },
    });

    if (type === "upload") {
      await fetch(`${process.env.VITE_SERVER_URL}/page/${scrape.id}`, {
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

    const shouldRefresh = formData.get("shouldRefresh") === "on";
    if (shouldRefresh) {
      await prisma.knowledgeGroup.update({
        where: { id: group.id },
        data: { status: "processing" },
      });

      const token = createToken(user!.id);
      await fetch(`${process.env.VITE_SERVER_URL}/scrape`, {
        method: "POST",
        body: JSON.stringify({
          scrapeId,
          knowledgeGroupId: group.id,
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    }

    const redirectUrl = formData.get("redirectUrl") as string;
    throw redirect(redirectUrl ?? `/knowledge/group/${group.id}`);
  }
}

export function NewKnowledgeGroupForm() {
  const [type, setType] = useState<string>("scrape_web:default");
  const sourceSpec = useMemo(() => {
    const [newType, subType] = type.split(":");
    return getSourceSpec(newType as KnowledgeGroupType, subType);
  }, [type]);

  return (
    <>
      <div
        className={cn(
          "p-4 bg-base-100 shadow",
          "rounded-box border border-base-300"
        )}
      >
        <RadioCard
          name="type"
          value={type}
          onChange={(value) => setType(value)}
          options={sourceSpecs.map((item) => ({
            label: item.name,
            value: [item.id, item.subType].join(":"),
            icon: item.icon,
          }))}
          cols={5}
        />
      </div>

      <p className="text-base-content/50 mt-2">
        {sourceSpec?.longDescription ?? "Select a source type to continue"}
      </p>

      <div className={cn("flex flex-col gap-2")}>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Name</legend>
          <input
            type="text"
            className="input w-full"
            required
            placeholder="Ex: Documentation"
            name="title"
          />
        </fieldset>

        {sourceSpec?.fields?.url && (
          <fieldset className="fieldset">
            <legend className="fieldset-legend">
              {sourceSpec.fields.url.name}
            </legend>
            <input
              className="input w-full"
              type="url"
              required
              pattern={sourceSpec.fields.url.pattern ?? "^https?://.+"}
              placeholder={
                sourceSpec.fields.url.placeholder ?? "https://example.com"
              }
              name="url"
            />
          </fieldset>
        )}

        {type === "upload:default" && (
          <>
            <input type="hidden" name="url" value="file" />
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Select files</legend>
              <input
                type="file"
                name="file"
                required
                className="file-input w-full"
                accept={
                  "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown,text/javascript,application/javascript,.tsx,.ts,.js,.jsx,.mdx"
                }
                multiple
              />
            </fieldset>
          </>
        )}

        {type === "scrape_github:default" && (
          <fieldset className="fieldset">
            <legend className="fieldset-legend">GitHub Branch</legend>
            <input
              type="text"
              className="input w-full"
              name="githubBranch"
              placeholder="main"
              defaultValue="main"
              required
            />
          </fieldset>
        )}

        {type === "notion:default" && (
          <>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                Internal Integration Secret
              </legend>
              <input
                className="input w-full"
                type="text"
                name="notionSecret"
                placeholder="Ex: ntn_xxxxx"
                required
              />
            </fieldset>
          </>
        )}

        {type === "confluence:default" && (
          <>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Email</legend>
              <input
                className="input w-full"
                type="text"
                name="confluenceEmail"
                placeholder="Ex: your@email.com"
                required
                pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Host</legend>
              <input
                className="input w-full"
                type="text"
                name="confluenceHost"
                placeholder="Ex: https://yourhost.atlassian.net"
                required
                pattern="^https://[a-b-_]+\\.atlassian\\.net$"
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Confluence API Key</legend>
              <input
                className="input w-full"
                type="text"
                name="confluenceApiKey"
                placeholder="Ex: ATATTXXXXXX"
                required
              />
            </fieldset>
          </>
        )}

        {(type === "linear:default" || type === "linear_projects:default") && (
          <>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Linear API Key</legend>
              <input
                className="input w-full"
                type="text"
                name="linearApiKey"
                placeholder="Ex: lin_api_xxxx"
                required
              />
            </fieldset>
          </>
        )}

        {type === "custom:default" && (
          <>
            <input type="hidden" name="url" value="https://none.com" />
          </>
        )}
      </div>
    </>
  );
}

export default function NewScrape() {
  const scrapeFetcher = useFetcher();

  useEffect(() => {
    if (scrapeFetcher.data?.error) {
      toast.error(
        scrapeFetcher.data.error ??
          scrapeFetcher.data.message ??
          "Unknown error"
      );
    }
  }, [scrapeFetcher.data]);

  return (
    <Page title="New knowledge group" icon={<TbBook2 />}>
      <scrapeFetcher.Form method="post" encType="multipart/form-data">
        <div className="flex flex-col gap-2">
          <NewKnowledgeGroupForm />

          <div className="flex justify-end">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={scrapeFetcher.state !== "idle"}
            >
              {scrapeFetcher.state !== "idle" && (
                <span className="loading loading-spinner" />
              )}
              Create
              <TbCheck />
            </button>
          </div>
        </div>
      </scrapeFetcher.Form>
    </Page>
  );
}

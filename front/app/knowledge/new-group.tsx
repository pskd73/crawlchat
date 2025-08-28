import type { Route } from "./+types/new-group";
import type { KnowledgeGroupStatus, KnowledgeGroupType } from "libs/prisma";
import type { FileUpload } from "@mjackson/form-data-parser";
import {
  TbBook2,
  TbBrandGithub,
  TbBrandNotion,
  TbCheck,
  TbUpload,
  TbWorld,
} from "react-icons/tb";
import { SiDocusaurus } from "react-icons/si";
import { redirect, useFetcher } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { Page } from "~/components/page";
import { createToken } from "libs/jwt";
import { parseFormData } from "@mjackson/form-data-parser";
import { useEffect, useMemo, useState } from "react";
import { prisma } from "~/prisma";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { RadioCard } from "~/components/radio-card";
import toast from "react-hot-toast";

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
    let url = formData.get("url") as string;
    let maxLinks = formData.get("maxLinks");
    let allowOnlyRegex = formData.get("allowOnlyRegex");
    let removeHtmlTags = formData.get("removeHtmlTags");
    let skipPageRegex = formData.get("skipPageRegex") as string;
    let subType = formData.get("subType") as string;

    let type = formData.get("type") as string;
    let githubRepoUrl = formData.get("githubRepoUrl");
    let githubBranch = formData.get("githubBranch");
    let prefix = formData.get("prefix");
    let title = formData.get("title") as string;

    if (type === "scrape_github") {
      if (!githubRepoUrl) {
        return { error: "GitHub Repo URL is required" };
      }

      if (!githubBranch) {
        return { error: "Branch name is required" };
      }

      url = `${githubRepoUrl}/tree/${githubBranch}`;
      allowOnlyRegex = "https://github.com/[^/]+/[^/]+/(tree|blob)/main.*";
      const removeSelectors = [".react-line-number", "#repos-file-tree"];
      removeHtmlTags = removeSelectors.join(",");
      maxLinks = "100";
    }

    if (type === "github_issues") {
      url = githubRepoUrl as string;
    }

    if (!url && type !== "notion") {
      return { error: "URL is required" };
    }

    if (prefix === "on") {
      allowOnlyRegex = `^${url.replace(/\/$/, "")}.*`;
    }

    if (type === "docusaurus") {
      type = "scrape_web";
    }

    if (formData.has("versionsToSkip")) {
      const value = formData.get("versionsToSkip") as string;
      skipPageRegex += `,${value
        .split(",")
        .map((v) => v.trim())
        .map((v) => "/docs/" + v)
        .join(",")}`;
    }

    let status: KnowledgeGroupStatus = "pending";

    if (type === "upload") {
      status = "done";
    }

    const group = await prisma.knowledgeGroup.create({
      data: {
        scrapeId: scrape.id,
        userId: user!.id,
        type: type as KnowledgeGroupType,
        status,

        title,

        url,
        matchPrefix: prefix === "on",
        removeHtmlTags: removeHtmlTags as string,
        maxPages: 5000,
        staticContentThresholdLength: 100,

        skipPageRegex,
        subType,

        notionSecret: formData.get("notionSecret") as string,

        githubBranch: githubBranch as string,
        githubUrl: githubRepoUrl as string,
      },
    });

    if (type === "upload") {
      for (const file of fileMarkdowns) {
        const response = await fetch(
          `${process.env.VITE_SERVER_URL}/resource/${scrape.id}`,
          {
            method: "POST",
            body: JSON.stringify({
              markdown: file.markdown,
              title: file.title,
              knowledgeGroupType: "upload",
              defaultGroupTitle: "Upload",
              knowledgeGroupId: group.id,
            }),
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${createToken(user!.id)}`,
            },
          }
        );

        console.log("Upload file", await response.text());
      }
    }

    throw redirect(`/knowledge/group/${group.id}`);
  }
}

export default function NewScrape({ loaderData }: Route.ComponentProps) {
  const scrapeFetcher = useFetcher();

  const types = useMemo(
    function () {
      return [
        {
          title: "Web",
          value: "scrape_web",
          description: "Scrape a website",
          icon: <TbWorld />,
          longDescription:
            "Scrapes the provided URL and children links it finds and turns them into the knowledge. It can also fetch dynamic content (Javascript based).",
        },
        {
          title: "Docusaurus based",
          value: "docusaurus",
          description: "Fetch Docusaurus based docs",
          icon: <SiDocusaurus />,
          longDescription:
            "Scrapes the Docusaurus based docs from the provided URL and turns them into the knowledge. It sets all required settings tailored for Docusaurus.",
        },
        {
          title: "Notion",
          value: "notion",
          description: "Scrape a Notion page",
          icon: <TbBrandNotion />,
          longDescription:
            "Connect to a Notion page and turns it into the knowledge.",
        },
        {
          title: "GitHub Issues",
          value: "github_issues",
          description: "Fetch GitHub issues",
          icon: <TbBrandGithub />,
          longDescription:
            "Fetch GitHub issues from the provided repository and turns them into the knowledge. The repository must be public (for now).",
        },
        {
          title: "Upload",
          value: "upload",
          description: "Upload a file. Supports pdf, docx, pptx",
          icon: <TbUpload />,
          longDescription: "Upload a file as the knowledge base",
        },
      ];
    },
    [loaderData.scrapes]
  );
  const [type, setType] = useState<string>("scrape_web");

  useEffect(() => {
    if (scrapeFetcher.data?.error) {
      toast.error(
        scrapeFetcher.data.error ??
          scrapeFetcher.data.message ??
          "Unknown error"
      );
    }
  }, [scrapeFetcher.data]);

  function getDescription(type: string) {
    return types.find((t) => t.value === type)?.longDescription;
  }

  return (
    <Page title="New knowledge group" icon={<TbBook2 />}>
      <scrapeFetcher.Form method="post" encType="multipart/form-data">
        <div className="flex flex-col gap-2">
          <div className="p-4 bg-base-200/50 rounded-box border border-base-300">
            <RadioCard
              name="type"
              value={type}
              onChange={(value) => setType(value)}
              options={types.map((item) => ({
                label: item.title,
                value: item.value,
                description: item.description,
                icon: item.icon,
              }))}
            />
          </div>

          <p className="text-base-content/50 mt-2">{getDescription(type)}</p>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Name</legend>
            <input
              type="text"
              className="input w-full"
              required
              placeholder="Ex: Documentation"
              name="title"
              disabled={scrapeFetcher.state !== "idle"}
            />
          </fieldset>

          {type === "scrape_web" && (
            <>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">URL</legend>
                <input
                  className="input w-full"
                  type="url"
                  required
                  pattern="^https?://.+"
                  placeholder="https://example.com"
                  name="url"
                  disabled={scrapeFetcher.state !== "idle"}
                />
              </fieldset>

              <label className="label">
                <input
                  type="checkbox"
                  name="prefix"
                  defaultChecked
                  className="toggle"
                />
                Match exact prefix
              </label>
            </>
          )}

          {type === "upload" && (
            <>
              <input type="hidden" name="url" value="file" />
              <input
                type="file"
                name="file"
                required
                className="file-input w-full"
                accept={
                  "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown"
                }
                multiple
                disabled={scrapeFetcher.state !== "idle"}
              />
            </>
          )}

          {type === "docusaurus" && (
            <>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Docs URL</legend>
                <input
                  className="input w-full"
                  type="url"
                  required
                  pattern="^https?://.+"
                  placeholder="https://example.com/docs"
                  name="url"
                  disabled={scrapeFetcher.state !== "idle"}
                />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Versions to skip</legend>
                <input
                  className="input w-full"
                  type="text"
                  placeholder="Ex: 1.0.0, 1.1.0, 2.x"
                  name="versionsToSkip"
                  disabled={scrapeFetcher.state !== "idle"}
                />
              </fieldset>
              <input
                type="hidden"
                name="removeHtmlTags"
                value="nav,aside,footer,header,.theme-announcement-bar"
              />
              <input type="hidden" name="prefix" value="on" />
              <input
                type="hidden"
                name="skipPageRegex"
                value="/docs/[0-9x]+\.[0-9x]+\.[0-9x]+,/docs/next"
              />
              <input type="hidden" name="subType" value="docusaurus" />
            </>
          )}

          {type === "github_issues" && (
            <>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">GitHub Repo URL</legend>
                <input
                  type="url"
                  className="input w-full"
                  name="githubRepoUrl"
                  placeholder="https://github.com/user/repo"
                  pattern="^https://github.com/.+$"
                  required
                />
              </fieldset>
            </>
          )}

          {type === "notion" && (
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

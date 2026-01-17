import type { Route } from "./+types/new-group";
import type { KnowledgeGroupStatus, KnowledgeGroupType } from "libs/prisma";
import type { FileUpload } from "@mjackson/form-data-parser";
import {
  TbBook2,
  TbBrandGithub,
  TbBrandNotion,
  TbCheck,
  TbUpload,
  TbVideo,
  TbWorld,
} from "react-icons/tb";
import { FaConfluence } from "react-icons/fa";
import { SiDocusaurus, SiLinear } from "react-icons/si";
import { redirect, useFetcher } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { Page } from "~/components/page";
import { createToken } from "libs/jwt";
import { parseFormData } from "@mjackson/form-data-parser";
import { useEffect, useMemo, useState } from "react";
import { prisma } from "libs/prisma";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { RadioCard } from "~/components/radio-card";
import toast from "react-hot-toast";
import { makeMeta } from "~/meta";
import cn from "@meltdownjs/cn";
import { v4 as uuidv4 } from "uuid";

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

    if (type === "github_discussions") {
      url = githubRepoUrl as string;
    }

    if (
      !url &&
      type !== "notion" &&
      type !== "confluence" &&
      type !== "linear" &&
      type !== "linear_projects" &&
      type !== "youtube" &&
      type !== "youtube_channel"
    ) {
      return { error: "URL is required" };
    }

    if (type === "youtube") {
      if (!url) {
        return { error: "YouTube video URL is required" };
      }
      const youtubeRegex =
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
      if (!youtubeRegex.test(url)) {
        return { error: "Invalid YouTube URL" };
      }
    }

    if (type === "youtube_channel") {
      if (!url) {
        return {
          error: "YouTube channel URL, channel ID, or handle is required",
        };
      }
      const channelRegex =
        /^(https?:\/\/)?(www\.)?(youtube\.com\/(channel\/|@|c\/|user\/)|@)?[a-zA-Z0-9_-]+/;
      const channelIdRegex = /^UC[a-zA-Z0-9_-]{22}$/;
      if (
        !channelRegex.test(url) &&
        !channelIdRegex.test(url) &&
        !url.startsWith("@")
      ) {
        return { error: "Invalid YouTube channel URL, channel ID, or handle" };
      }
    }

    if (prefix === "on") {
      allowOnlyRegex = `^${url.replace(/\/$/, "")}.*`;
    }

    if (type === "docusaurus") {
      type = "scrape_web";
    }

    if (formData.get("versionsToSkip")) {
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

    const youtubeUrls = type === "youtube" && url ? [{ url }] : undefined;

    const group = await prisma.knowledgeGroup.create({
      data: {
        scrapeId: scrape.id,
        userId: user!.id,
        type: type as KnowledgeGroupType,
        status,

        title,

        url: type === "youtube" ? undefined : url,
        urls: youtubeUrls,
        matchPrefix: prefix === "on",
        removeHtmlTags: removeHtmlTags as string,
        maxPages: 5000,
        staticContentThresholdLength: 100,

        skipPageRegex,
        subType,

        notionSecret: formData.get("notionSecret") as string,

        confluenceApiKey: formData.get("confluenceApiKey") as string,
        confluenceEmail: formData.get("confluenceEmail") as string,
        confluenceHost: formData.get("confluenceHost") as string,

        linearApiKey: formData.get("linearApiKey") as string,

        githubBranch: githubBranch as string,
        githubUrl: githubRepoUrl as string,
      },
    });

    if (type === "upload") {
      await fetch(
        `${process.env.VITE_SERVER_URL}/page/${scrape.id}`,
        {
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
        }
      );
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

export function NewKnowledgeGroupForm({
  disabled,
  skip,
}: {
  disabled?: boolean;
  skip?: string[];
}) {
  const types = useMemo(function () {
    const types = [
      {
        title: "Web",
        value: "scrape_web",
        description: "Scrape a website",
        icon: <TbWorld />,
        longDescription:
          "Scrapes the provided URL and children links it finds and turns them into the knowledge. It can also fetch dynamic content (Javascript based).",
      },
      {
        title: "Docusaurus",
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
        longDescription: (
          <p>
            Connect to a Notion page and turns it into the knowledge. Learn more
            about creating an API Key{" "}
            <a
              href="https://docs.crawlchat.app/knowledge-base/notion"
              target="_blank"
              className="link link-primary"
            >
              here
            </a>
          </p>
        ),
      },
      {
        title: "GH Issues",
        value: "github_issues",
        description: "Fetch GitHub issues",
        icon: <TbBrandGithub />,
        longDescription:
          "Fetch GitHub issues from the provided repository and turns them into the knowledge. The repository must be public (for now).",
      },
      {
        title: "GH Discussions",
        value: "github_discussions",
        description: "Fetch GitHub discussions",
        icon: <TbBrandGithub />,
        longDescription:
          "Fetch GitHub discussions from the provided repository and turns them into the knowledge. The repository must be public (for now).",
      },
      {
        title: "Upload",
        value: "upload",
        description: "Upload a file",
        icon: <TbUpload />,
        longDescription: "Upload a file as the knowledge base",
      },
      {
        title: "Confluence",
        value: "confluence",
        description: "Fetch Confluence pages",
        icon: <FaConfluence />,
        longDescription: (
          <p>
            Fetch Confluence pages as the knowledge base. Learn more about
            creating an API Key{" "}
            <a
              href="https://docs.crawlchat.app/knowledge-base/confluence-pages"
              target="_blank"
              className="link link-primary"
            >
              here
            </a>
          </p>
        ),
      },
      {
        title: "Linear Issues",
        value: "linear",
        description: "Fetch Linear issues",
        icon: <SiLinear />,
        longDescription: (
          <p>
            Fetch Linear issues as the knowledge base. Learn more about creating
            an API Key{" "}
            <a
              href="https://docs.crawlchat.app/knowledge-base/linear-issues"
              target="_blank"
              className="link link-primary"
            >
              here
            </a>
          </p>
        ),
      },
      {
        title: "Linear Projects",
        value: "linear_projects",
        description: "Fetch Linear projects",
        icon: <SiLinear />,
        longDescription: (
          <p>
            Fetch Linear projects as the knowledge base. Learn more about
            creating an API Key{" "}
            <a
              href="https://docs.crawlchat.app/knowledge-base/linear-issues"
              target="_blank"
              className="link link-primary"
            >
              here
            </a>
          </p>
        ),
      },
      {
        title: "Custom",
        value: "custom",
        description: "Use API to add content",
        icon: <TbBook2 />,
        longDescription: (
          <p>
            Use API to add content to the knowledge base. Learn more about the
            API{" "}
            <a
              href="https://docs.crawlchat.app/api/add-page"
              target="_blank"
              className="link link-primary"
            >
              here
            </a>
          </p>
        ),
      },
      {
        title: "YouTube Video",
        value: "youtube",
        description: "Add YouTube video transcript",
        icon: <TbVideo />,
        longDescription:
          "Extract transcript from a YouTube video and add it to the knowledge base. Provide the YouTube video URL.",
      },
      {
        title: "YouTube Channel",
        value: "youtube_channel",
        description: "Add YouTube channel videos",
        icon: <TbVideo />,
        longDescription:
          "Fetch all videos from a YouTube channel and extract their transcripts. Provide the YouTube channel URL, channel ID, or handle (e.g., @channelname).",
      },
    ];

    if (skip) {
      return types.filter((t) => !skip.includes(t.value));
    }

    return types;
  }, []);
  const [type, setType] = useState<string>("scrape_web");
  const [skipUrls, setSkipUrls] = useState<string[]>([]);

  function getDescription(type: string) {
    return types.find((t) => t.value === type)?.longDescription;
  }

  return (
    <>
      <div className="p-4 bg-base-200/50 rounded-box border border-base-300">
        <RadioCard
          name="type"
          value={type}
          onChange={(value) => setType(value)}
          options={types.map((item) => ({
            label: item.title,
            value: item.value,
            icon: item.icon,
          }))}
          cols={5}
        />
      </div>

      <p className="text-base-content/50 mt-2">{getDescription(type)}</p>

      <div
        className={cn(
          "flex flex-col gap-2 bg-base-200/50 p-4 rounded-box",
          "border border-base-300 shadow"
        )}
      >
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Name</legend>
          <input
            type="text"
            className="input w-full"
            required
            placeholder="Ex: Documentation"
            name="title"
            disabled={disabled}
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
                disabled={disabled}
              />
            </fieldset>

            <label className="label">
              <input
                type="checkbox"
                name="prefix"
                defaultChecked
                className="toggle"
                disabled={disabled}
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
                "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown,text/javascript,application/javascript,.tsx,.ts,.js,.jsx,.mdx"
              }
              multiple
              disabled={disabled}
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
                disabled={disabled}
              />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Versions to skip</legend>
              <input
                className="input w-full"
                type="text"
                placeholder="Ex: 1.0.0, 1.1.0, 2.x"
                name="versionsToSkip"
                disabled={disabled}
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

        {type === "github_discussions" && (
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

        {type === "confluence" && (
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
                disabled={disabled}
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
                disabled={disabled}
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
                disabled={disabled}
              />
            </fieldset>
          </>
        )}

        {(type === "linear" || type === "linear_projects") && (
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

        {type === "custom" && (
          <>
            <input type="hidden" name="url" value="https://none.com" />
          </>
        )}

        {type === "youtube" && (
          <>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">YouTube Video URL</legend>
              <input
                className="input w-full"
                type="url"
                required
                pattern="^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$"
                placeholder="https://www.youtube.com/watch?v=..."
                name="url"
                disabled={disabled}
              />
            </fieldset>
          </>
        )}

        {type === "youtube_channel" && (
          <>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                YouTube Channel URL, ID, or Handle
              </legend>
              <input
                className="input w-full"
                type="text"
                required
                placeholder="https://www.youtube.com/@channelname or @channelname or UC-9-kyTW8ZkZNDHQJ6FgpwQ"
                name="url"
                disabled={disabled}
              />
              <p className="text-sm text-gray-500 mt-2">
                You can provide a channel URL (e.g.,
                https://www.youtube.com/@channelname), a channel handle (e.g.,
                @channelname), or a channel ID (e.g., UC-9-kyTW8ZkZNDHQJ6FgpwQ).
              </p>
            </fieldset>
          </>
        )}
      </div>
    </>
  );
}

export default function NewScrape({ loaderData }: Route.ComponentProps) {
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
          <NewKnowledgeGroupForm disabled={scrapeFetcher.state !== "idle"} />

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

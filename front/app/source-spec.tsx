import {
  TbBook2,
  TbBrandGithub,
  TbBrandNotion,
  TbBrandYoutube,
  TbUpload,
  TbWorld,
} from "react-icons/tb";
import { FaConfluence } from "react-icons/fa";
import { SiDocusaurus, SiLinear } from "react-icons/si";
import type {
  KnowledgeGroupType,
  KnowledgeGroupUpdateFrequency,
} from "@packages/common/prisma";

export type SourceFields = {
  url?: {
    required: boolean;
    name: string;
    pattern?: string;
    placeholder?: string;
  };
};

export type SourceSpec = {
  id: KnowledgeGroupType;
  name: string;
  canSync: boolean;
  description: string;
  longDescription: React.ReactNode;
  fields: SourceFields;
  icon: React.ReactNode;
  subType: string;
  showUrl: boolean;
  autoSyncIntervals: KnowledgeGroupUpdateFrequency[];
  canClearStalePages: boolean;
  canSkipPages: boolean;
};

export const sourceSpecs: SourceSpec[] = [
  {
    name: "Web",
    id: "scrape_web",
    subType: "default",
    description: "Scrape a website",
    icon: <TbWorld />,
    longDescription:
      "Scrapes the provided URL and children links it finds and turns them into the knowledge. It can also fetch dynamic content (Javascript based).",
    canSync: true,
    fields: {
      url: {
        required: true,
        name: "URL",
        pattern: "^https?://.+$",
        placeholder: "https://example.com",
      },
    },
    showUrl: true,
    autoSyncIntervals: ["daily", "weekly", "monthly"],
    canClearStalePages: true,
    canSkipPages: true,
  },
  {
    name: "Docusaurus",
    id: "scrape_web",
    description: "Fetch Docusaurus based docs",
    subType: "docusaurus",
    icon: <SiDocusaurus />,
    longDescription:
      "Scrapes the Docusaurus based docs from the provided URL and turns them into the knowledge. It sets all required settings tailored for Docusaurus.",
    canSync: true,
    fields: {
      url: {
        required: true,
        name: "URL",
        pattern: "^https?://.+$",
        placeholder: "https://example.com",
      },
    },
    showUrl: true,
    autoSyncIntervals: ["daily", "weekly", "monthly"],
    canClearStalePages: true,
    canSkipPages: true,
  },
  {
    name: "Notion",
    id: "notion",
    subType: "default",
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
    canSync: true,
    fields: {},
    showUrl: false,
    autoSyncIntervals: ["daily", "weekly", "monthly"],
    canClearStalePages: true,
    canSkipPages: true,
  },
  {
    name: "GH Repo",
    id: "scrape_github",
    subType: "default",
    description: "Index a GitHub repository",
    icon: <TbBrandGithub />,
    longDescription: "Turn a GitHub repository into the knowledge base.",
    canSync: false,
    fields: {
      url: {
        required: true,
        name: "GitHub Repo URL",
        pattern: "^https://github.com/.+$",
        placeholder: "https://github.com/user/repo",
      },
    },
    showUrl: true,
    autoSyncIntervals: [],
    canClearStalePages: false,
    canSkipPages: false,
  },
  {
    name: "GH Issues",
    id: "github_issues",
    subType: "default",
    description: "Fetch GitHub issues",
    icon: <TbBrandGithub />,
    longDescription:
      "Fetch GitHub issues from the provided repository and turns them into the knowledge. The repository must be public (for now).",
    canSync: true,
    fields: {
      url: {
        required: true,
        name: "GitHub Repo URL",
        pattern: "^https://github.com/.+$",
        placeholder: "https://github.com/user/repo",
      },
    },
    showUrl: true,
    autoSyncIntervals: ["daily", "weekly", "monthly"],
    canClearStalePages: true,
    canSkipPages: false,
  },
  {
    name: "GH Discussions",
    id: "github_discussions",
    subType: "default",
    description: "Fetch GitHub discussions",
    icon: <TbBrandGithub />,
    longDescription:
      "Fetch GitHub discussions from the provided repository and turns them into the knowledge. The repository must be public (for now).",
    canSync: true,
    fields: {
      url: {
        required: true,
        name: "GitHub Repo URL",
        pattern: "^https://github.com/.+$",
        placeholder: "https://github.com/user/repo",
      },
    },
    showUrl: true,
    autoSyncIntervals: ["daily", "weekly", "monthly"],
    canClearStalePages: true,
    canSkipPages: false,
  },
  {
    name: "Upload",
    id: "upload",
    subType: "default",
    description: "Upload a file",
    icon: <TbUpload />,
    longDescription: "Upload a file as the knowledge base",
    canSync: false,
    fields: {},
    showUrl: false,
    autoSyncIntervals: [],
    canClearStalePages: false,
    canSkipPages: false,
  },
  {
    name: "Confluence",
    id: "confluence",
    subType: "default",
    description: "Fetch Confluence pages",
    icon: <FaConfluence />,
    longDescription: (
      <p>
        Fetch Confluence pages as the knowledge base. Learn more about creating
        an API Key{" "}
        <a
          href="https://docs.crawlchat.app/knowledge-base/confluence-pages"
          target="_blank"
          className="link link-primary"
        >
          here
        </a>
      </p>
    ),
    canSync: true,
    fields: {},
    showUrl: false,
    autoSyncIntervals: ["hourly", "daily", "weekly", "monthly"],
    canClearStalePages: true,
    canSkipPages: true,
  },
  {
    name: "Linear Issues",
    id: "linear",
    subType: "default",
    description: "Fetch Linear issues",
    icon: <SiLinear />,
    longDescription: (
      <p>
        Fetch Linear issues as the knowledge base. Learn more about creating an
        API Key{" "}
        <a
          href="https://docs.crawlchat.app/knowledge-base/linear-issues"
          target="_blank"
          className="link link-primary"
        >
          here
        </a>
      </p>
    ),
    canSync: true,
    fields: {},
    showUrl: false,
    autoSyncIntervals: ["hourly", "daily", "weekly", "monthly"],
    canClearStalePages: true,
    canSkipPages: false,
  },
  {
    name: "Linear Projects",
    id: "linear_projects",
    subType: "default",
    description: "Fetch Linear projects",
    icon: <SiLinear />,
    longDescription: (
      <p>
        Fetch Linear projects as the knowledge base. Learn more about creating
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
    canSync: true,
    fields: {},
    showUrl: false,
    autoSyncIntervals: ["hourly", "daily", "weekly", "monthly"],
    canClearStalePages: true,
    canSkipPages: false,
  },
  {
    name: "Custom",
    id: "custom",
    subType: "default",
    description: "Use API to add content",
    icon: <TbBook2 />,
    longDescription: (
      <p>
        Use API to add content to the knowledge base. Learn more about the API{" "}
        <a
          href="https://docs.crawlchat.app/api/add-page"
          target="_blank"
          className="link link-primary"
        >
          here
        </a>
      </p>
    ),
    canSync: false,
    fields: {},
    showUrl: false,
    autoSyncIntervals: [],
    canClearStalePages: false,
    canSkipPages: false,
  },
  {
    name: "Video",
    id: "youtube",
    subType: "default",
    description: "Add YouTube video transcript",
    icon: <TbBrandYoutube />,
    longDescription:
      "Extract transcript from a YouTube video and add it to the knowledge base. Provide the YouTube video URL.",
    canSync: true,
    fields: {
      url: {
        required: true,
        name: "YouTube Video URL",
        pattern: "^https://www.youtube.com/.+$",
        placeholder: "https://www.youtube.com/watch?v=...",
      },
    },
    showUrl: false,
    autoSyncIntervals: ["weekly", "monthly"],
    canClearStalePages: true,
    canSkipPages: false,
  },
  {
    name: "Channel",
    id: "youtube_channel",
    subType: "default",
    description: "Add YouTube channel videos",
    icon: <TbBrandYoutube />,
    longDescription:
      "Fetch all videos from a YouTube channel and extract their transcripts. Provide the YouTube channel URL, channel ID, or handle (e.g., @channelname).",
    canSync: true,
    fields: {
      url: {
        required: true,
        name: "YouTube Channel URL, ID, or Handle",
        pattern: "^https://www.youtube.com/.+$",
        placeholder: "https://www.youtube.com/@channelname",
      },
    },
    showUrl: true,
    autoSyncIntervals: ["daily", "weekly", "monthly"],
    canClearStalePages: true,
    canSkipPages: true,
  },
];

export function getSourceSpec(
  type: KnowledgeGroupType,
  subType?: string | null
) {
  return sourceSpecs.find(
    (spec) => spec.id === type && spec.subType === (subType ?? "default")
  );
}

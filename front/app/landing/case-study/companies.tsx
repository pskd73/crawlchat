import {
  TbBrandChrome,
  TbBrandDiscord,
  TbBrandGithub,
  TbBrandNotion,
  TbBrandSlack,
  TbBrandYoutube,
  TbCode,
  TbPointer,
  TbWorld,
} from "react-icons/tb";
import { MCPIcon } from "~/components/mcp-icon";
import {
  AntonTestimonial,
  EgelhausTestimonial,
  HarshTestimonial,
  JonnyTestimonial,
} from "../page";

type CaseStudyCompany = {
  title: string;
  logo: string;
  darkLogo?: boolean;
  logoLabel?: string;
  description: string;
  overview: React.ReactNode;
  challengesSummary: React.ReactNode;
  challenges: string[];
  sources: {
    icon: React.ReactNode;
    title: string;
    tooltip: string;
  }[];
  channels: {
    icon: React.ReactNode;
    title: string;
    tooltip: string;
  }[];
  resultsSummary: string;
  results: (string | React.ReactNode)[];
  testimonial: React.ReactNode;
};

export const companies: Record<string, CaseStudyCompany> = {
  remotion: {
    title: "Remotion",
    logo: "https://www.remotion.dev/img/new-logo.png",
    description:
      "Learn more about how Remotion uses CrawlChat to power their documentation.",
    overview: (
      <div>
        <p>
          <a
            href="https://remotion.dev/"
            target="_blank"
            className="link link-primary link-hover"
          >
            Remotion
          </a>{" "}
          is an source-open framework that lets developers create videos using
          React. Instead of traditional video editors, you build videos with
          code, using HTML, CSS, and JavaScript to design animations and
          visuals, which can be rendered into video files like MP4.
        </p>
        <p className="mt-2">
          Remotion is a documentation-heavy software and needed a better way for
          its community to find answers to their questions. By integrating
          CrawlChat, Remotion was able to achieve exactly that.
        </p>
      </div>
    ),
    challengesSummary: <p></p>,
    challenges: [
      "No quick way to find answers to questions on the documentation pages",
      "A lot of repetitive questions are already covered in the documentation",
      "A lot of time spent on answering questions on Discord server",
      "No visibility into the questions asked",
    ],
    sources: [
      {
        icon: <TbWorld />,
        title: "Website",
        tooltip: "Documentation website",
      },
      {
        icon: <TbBrandDiscord />,
        title: "Discord",
        tooltip: "Discord conversations",
      },
    ],
    channels: [
      {
        icon: <TbWorld />,
        title: "Website",
        tooltip: "Website widget",
      },
      {
        icon: <TbBrandDiscord />,
        title: "Discord",
        tooltip: "Discord bot",
      },
      {
        icon: <MCPIcon />,
        title: "MCP",
        tooltip: "MCP server",
      },
    ],
    resultsSummary:
      "By integrating CrawlChat, Remotion was able to achieve following results:",
    results: [
      "1st level queries are answered on Discord server",
      "Repetitive questions are answered on the documentation pages",
      "Developers get instant help in their IDEs using MCP",
    ],
    testimonial: <JonnyTestimonial />,
  },
  polotno: {
    title: "Polotno",
    logo: "/used-by/polotno-new.png",
    description:
      "Learn more about how Polotno uses CrawlChat to power their documentation.",
    overview: (
      <div>
        <p>
          <a
            href="https://polotno.com/"
            target="_blank"
            className="link link-primary link-hover"
          >
            Polotno
          </a>{" "}
          is a browser-based image and video design platform that lets users
          create banners, ads, reels and visuals easily with drag-and-drop
          tools, templates, and export options like JPG, PNG, PDF, GIF, and MP4.
          It also offers a customizable SDK so businesses can embed a
          white-label design editor into their products, enabling automated and
          integrated creative workflows.
        </p>
        <p className="mt-2">
          Polotno has a great community of people and they needed a better way
          of finding answers to their questions. By integrating CrawlChat,
          Polotno was able to achieve exactly that.
        </p>
      </div>
    ),
    challengesSummary: <p></p>,
    challenges: [
      "Information scattered across different sources",
      "Repetitive questions are asked frequently",
      "No visibility into the questions asked",
    ],
    sources: [
      {
        icon: <TbWorld />,
        title: "Docs",
        tooltip: "Documentation website",
      },
      {
        icon: <TbWorld />,
        title: "Threads",
        tooltip: "Community conversations",
      },
    ],
    channels: [
      {
        icon: <TbWorld />,
        title: "Website",
        tooltip: "Website widget",
      },
      {
        icon: <MCPIcon />,
        title: "MCP",
        tooltip: "MCP server",
      },
    ],
    resultsSummary:
      "By integrating CrawlChat, Polotno was able to achieve following results:",
    results: [
      "Documentation support is now available 24/7",
      <span>
        <a
          href="https://community.polotno.com/"
          target="_blank"
          className="link link-primary link-hover"
        >
          Community conversations
        </a>{" "}
        are turned into a knowledge base
      </span>,
      "Developers get instant help in their IDEs using MCP",
      "Find data gaps in the documentation and improve it",
    ],
    testimonial: <AntonTestimonial />,
  },
  postiz: {
    title: "Postiz",
    logo: "https://postiz.com/_next/static/media/logo.7379cc96.svg",
    darkLogo: true,
    description:
      "Learn more about how Postiz uses CrawlChat to power their documentation.",
    overview: (
      <div>
        <p>
          <a
            href="https://postiz.com/"
            target="_blank"
            className="link link-primary link-hover"
          >
            Postiz
          </a>{" "}
          is an open-source social media scheduling and management tool that
          helps users plan, publish, and automate posts across multiple
          platforms from a single dashboard. It includes AI features for content
          creation, analytics, collaboration, and supports self-hosting or cloud
          deployment to suit individual or business needs.
        </p>
        <p className="mt-2">
          Postiz is a growing open-source project and they needed a better way
          to answer questions from their community. By integrating CrawlChat,
          Postiz is able to serve the self-hosting community better. The tech
          documentation support became easy as well.
        </p>
      </div>
    ),
    challengesSummary: <p></p>,
    challenges: [
      "Support for self-hosting users on Discord was challenging",
      "Hard to navigate through the documentation pages",
      "Base 24x7 support was not available",
    ],
    sources: [
      {
        icon: <TbWorld />,
        title: "Docs",
        tooltip: "Documentation website",
      },
      {
        icon: <TbBrandNotion />,
        title: "Notion",
        tooltip: "Common issues and solutions",
      },
      {
        icon: <TbBrandGithub />,
        title: "Issues",
        tooltip: "GitHub issues",
      },
      {
        icon: <TbBrandYoutube />,
        title: "YouTube",
        tooltip: "Tutorial videos",
      },
      {
        icon: <TbPointer />,
        title: "Actions",
        tooltip: "Realtime downtime monitoring",
      },
    ],
    channels: [
      {
        icon: <TbWorld />,
        title: "Website",
        tooltip: "Website widget",
      },
      {
        icon: <TbBrandDiscord />,
        title: "Discord",
        tooltip: "Community conversations",
      },
      {
        icon: <TbCode />,
        title: "API",
        tooltip: "For in-app custom support",
      },
    ],
    resultsSummary:
      "By integrating CrawlChat, Postiz was able to achieve following results:",
    results: [
      "Self-hosting community is now served better",
      <span>
        AI powered{" "}
        <a
          href="https://docs.postiz.com/"
          target="_blank"
          className="link link-primary link-hover"
        >
          documentation support
        </a>
      </span>,
      "360 degree visibility into the questions asked",
    ],
    testimonial: <EgelhausTestimonial />,
  },
  localstack: {
    title: "LocalStack",
    logo: "/used-by/localstack.png",
    description:
      "Learn more about how LocalStack uses CrawlChat to power their documentation.",
    overview: (
      <div>
        <p>
          <a
            href="https://localstack.dev/"
            target="_blank"
            className="link link-primary link-hover"
          >
            LocalStack
          </a>{" "}
          is a fully functional local AWS cloud stack that lets developers
          develop and test their cloud and serverless apps offline. It provides
          a local testing environment that emulates AWS services, enabling
          faster development cycles without relying on remote cloud resources.
        </p>
        <p className="mt-2">
          LocalStack has extensive documentation and a vibrant community. They
          added <span className="font-semibold">~6,000 pages</span> to their
          knowledge base spanning docs, YouTube videos, GitHub issues, codebase,
          and Slack conversations. By integrating CrawlChat, LocalStack now
          delivers AI-powered support wherever their users need it.
        </p>
      </div>
    ),
    challengesSummary: <p></p>,
    challenges: [
      "Users needed quick answers across documentation, Slack, and other platforms",
      "Repetitive questions consumed valuable support time",
      "No unified knowledge base across multiple sources",
      "Needed to support developers in their IDEs via MCP",
    ],
    sources: [
      {
        icon: <TbWorld />,
        title: "Docs",
        tooltip: "Documentation website",
      },
      {
        icon: <TbBrandYoutube />,
        title: "YouTube",
        tooltip: "YouTube videos",
      },
      {
        icon: <TbBrandGithub />,
        title: "Issues",
        tooltip: "GitHub issues",
      },
      {
        icon: <TbCode />,
        title: "Codebase",
        tooltip: "GitHub codebase",
      },
      {
        icon: <TbBrandSlack />,
        title: "Slack",
        tooltip: "Slack conversations",
      },
    ],
    channels: [
      {
        icon: <TbWorld />,
        title: "Docs",
        tooltip: "Docs site widget",
      },
      {
        icon: <TbBrandSlack />,
        title: "Slack",
        tooltip: "Slack bot",
      },
      {
        icon: <MCPIcon />,
        title: "MCP",
        tooltip: "MCP server",
      },
      {
        icon: <TbCode />,
        title: "API",
        tooltip: "API integration",
      },
    ],
    resultsSummary:
      "By integrating CrawlChat, LocalStack was able to achieve following results:",
    results: [
      "24/7 AI-powered documentation support",
      "Unified answers across docs site, Slack, MCP, and APIs",
      <span>
        <TbBrandChrome className="inline" /> Chrome extension to compose answers
        on other platforms
      </span>,
      "Developers get instant help in their IDEs using MCP",
    ],
    testimonial: <HarshTestimonial />,
    logoLabel: "LocalStack",
  },
};

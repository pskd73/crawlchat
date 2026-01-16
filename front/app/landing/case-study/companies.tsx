import {
  TbApi,
  TbBrandDiscord,
  TbBrandGithub,
  TbBrandNotion,
  TbBrandYoutube,
  TbCode,
  TbPointer,
  TbWorld,
} from "react-icons/tb";
import {
  AntonTestimonial,
  EgelhausTestimonial,
  JonnyTestimonial,
} from "../page";
import { MCPIcon } from "~/components/mcp-icon";

type CaseStudyCompany = {
  title: string;
  logo: string;
  darkLogo?: boolean;
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
    testimonial: <JonnyTestimonial small />,
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
        title: "Conversations",
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
    testimonial: <AntonTestimonial small />,
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
    testimonial: <EgelhausTestimonial small />,
  },
};

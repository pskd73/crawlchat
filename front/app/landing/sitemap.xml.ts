import { readPosts } from "../blog/posts";
import { buildChangelogMonthGroups } from "../changelog/month-groups";

const BASE_URL = "https://crawlchat.app";

// https://api.blogmaker.app/d87c8fd7a63a68c65f829685b576b9b75aded921/export.json
const blogPostPaths = [
  "/blog/actions-on-crawlchat",
  "/blog/ai-assistants-for-engineering-teams-practical-wins-without-the-hype",
  "/blog/ai-for-api-documentation-navigation-features-and-implementation",
  "/blog/ai-powered-documentation-for-enterprise-teams-faster-answers-fresher-docs",
  "/blog/ai-solutions-for-outdated-technical-docs-what-actually-works",
  "/blog/ai-systems-for-engineering-knowledge-management",
  "/blog/basic-rag-vs-agentic-rag",
  "/blog/boosting-developer-experience-with-crawlchat",
  "/blog/challenges-teams-face-after-using-kapaai-after-launch",
  "/blog/choosing-between-inkeep-and-ai-assistants-for-developer-docs-teams",
  "/blog/developer-experience-challenges-in-saas-products-and-how-to-spot-them-early",
  "/blog/docsbotai-review-2026-trustworthy-answers-from-your-docs-or-just-good-enough",
  "/blog/essential-tools-for-tech-docs-that-help-users",
  "/blog/how-ai-docs-assistants-cut-support-tickets",
  "/blog/how-crawlchat-data-gaps-help-your-docs",
  "/blog/how-discord-bot-helps",
  "/blog/how-documentation-impacts-saas-customer-retention-and-why-its-often-the-deciding-factor",
  "/blog/how-engineers-actually-use-documentation-what-gets-read-skipped-and-copied",
  "/blog/how-inkeep-handles-large-knowledge-bases-without-losing-accuracy",
  "/blog/how-polotno-uses-crawlchat",
  "/blog/how-postiz-uses-crawlchat",
  "/blog/how-product-managers-can-use-chat-analytics",
  "/blog/how-remotion-uses-crawlchat",
  "/blog/how-to-add-ask-ai-chatbot-to-docusaurus-site",
  "/blog/how-to-do-basic-rag",
  "/blog/how-to-embed-ai-chatbot",
  "/blog/how-to-leverage-analytics-from-your-documentation-chatbot",
  "/blog/how-to-setup-mcp-for-your-documentation",
  "/blog/identify-documentation-gaps-with-ai",
  "/blog/improving-developer-onboarding-with-ai-docs-what-actually-helps",
  "/blog/internal-assistant-for-gtm-teams",
  "/blog/kapaai-review-in-2026-a-practical-look-for-docs-support-and-devrel-teams",
  "/blog/kapaai-vs-docsbotai-vs-crawlchat-best-ai-support-tool-for-2026",
  "/blog/knowledge-management-best-practices-for-saas-teams-that-ship-weekly",
  "/blog/making-product-knowledge-instantly-accessible",
  "/blog/making-technical-docs-easier-to-understand-checklist",
  "/blog/scaling-docs-without-more-writers-system-and-tactics",
  "/blog/setup-linear-connector-on-crawlchat",
  "/blog/sitegptai-review-in-2026-a-practical-look-for-docs-and-support-teams",
  "/blog/static-docs-to-interactive-answers-with-rag-for-devs",
  "/blog/the-future-of-knowledge-bases-for-saas-ai-answers-real-time-docs-and-smarter-analytics",
  "/blog/what-teams-should-know-about-inkeep-2026-guide-for-support-product-and-dev-teams",
  "/blog/why-a-regular-chatbot-is-not-enough-for-serious-tech-documentation",
  "/blog/why-chat-gpt-is-not-enough-for-your-tech-docs",
  "/blog/why-crawlchat-is-the-better-choice-for-you",
  "/blog/why-developers-ignore-traditional-documentation-and-what-actually-works",
  "/blog/why-documentation-fails-in-fast-growing-startups-and-how-to-stop-the-rot",
  "/blog/why-you-need-to-integrate-chatbot-ai-to-your-documentation",
];

const staticPaths = [
  "/",
  "/blog",
  "/pricing",
  "/discord-bot",
  "/support-tickets",
  "/ai-models",
  "/open-source",
  "/public-bots",
  "/ask-github-repo",
  "/changelog",
  "/terms",
  "/policy",
  "/data-privacy",
  "/use-case",
  "/use-case/community-support",
  "/use-case/empower-gtm-teams",
  "/use-case/customer-support-automation",
  "/use-case/discord-community-automation",
  "/compare/crawlchat-vs-kapaai",
  "/compare/crawlchat-vs-docsbot",
  "/compare/crawlchat-vs-chatbase",
  "/compare/crawlchat-vs-mava",
  "/compare/crawlchat-vs-sitegpt",
  "/case-study",
  "/case-study/remotion",
  "/case-study/polotno",
  "/case-study/postiz",
  "/case-study/localstack",
];

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toUrlTag(path: string, lastmod?: string) {
  const loc = `${BASE_URL}${path}`;
  const lastmodTag = lastmod ? `<lastmod>${lastmod}</lastmod>` : "";
  return `<url><loc>${xmlEscape(loc)}</loc>${lastmodTag}</url>`;
}

export function loader() {
  const publishedChangelog = readPosts("changelog").filter(
    (post) => post.type === "changelog" && post.status === "published"
  );

  const changelogPosts = publishedChangelog.map((post) => ({
    path: `/changelog/${post.slug}`,
    lastmod: post.date.toISOString().slice(0, 10),
  }));

  const monthToLastmod = new Map<string, string>();
  for (const post of publishedChangelog) {
    const y = post.date.getFullYear();
    const m = post.date.getMonth() + 1;
    const key = `${y}-${m}`;
    const day = post.date.toISOString().slice(0, 10);
    const prev = monthToLastmod.get(key);
    if (!prev || day > prev) {
      monthToLastmod.set(key, day);
    }
  }

  const changelogMonthArchives = buildChangelogMonthGroups(
    publishedChangelog
  ).map((g) => ({
    path: g.href,
    lastmod: monthToLastmod.get(`${g.year}-${g.month}`)!,
  }));

  const now = new Date().toISOString().slice(0, 10);
  const staticUrls = staticPaths.map((path) => ({ path, lastmod: now }));
  const blogUrls = blogPostPaths.map((path) => ({ path, lastmod: now }));
  const urls = [
    ...staticUrls,
    ...blogUrls,
    ...changelogPosts,
    ...changelogMonthArchives,
  ];
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls.map((url) => toUrlTag(url.path, url.lastmod)).join("") +
    `</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

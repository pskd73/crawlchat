import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  ...prefix("login", [
    index("auth/login.tsx"),
    route("verify", "auth/verify.ts"),
  ]),

  index("landing/page.tsx"),
  route("llm-txt", "landing/tools/llm-txt.tsx"),
  route("open-scrape", "landing/open-scrape.ts"),
  route("terms", "landing/terms.tsx"),
  route("policy", "landing/policy.tsx"),
  route("embed-demo", "landing/embed-demo.tsx"),
  route("use-case/embed", "landing/use-case/embed.tsx"),
  route("use-case/mcp", "landing/use-case/mcp.tsx"),
  route("use-case/discord-bot", "landing/use-case/discord-bot.tsx"),

  route("test", "landing/test.tsx"),

  route("payment/lemonsqueezy-webhook", "payment/lemonsqueezy-webhook.ts"),

  ...prefix("triggers", [
    route("weekly", "triggers/weekly.tsx"),
  ]),

  route("/logout", "auth/logout.tsx"),
  layout("dashboard/layout.tsx", [
    route("app", "dashboard/page.tsx"),
    route("collections", "scrapes/page.tsx"),
    route("settings", "dashboard/settings.tsx"),
    route("scrape", "scrapes/new-scrape.tsx"),

    route("collections/:id", "scrapes/scrape-page.tsx", [
      route("settings", "scrapes/scrape-settings.tsx"),
      route("links", "scrapes/scrape-links.tsx", [
        route(":itemId", "scrapes/scrape-item.tsx"),
      ]),
      route("mcp", "scrapes/scrape-mcp.tsx"),
      route("embed", "scrapes/scrape-embed.tsx"),
      route("integrations", "scrapes/scrape-integrations.tsx"),
    ]),
    
    route("messages", "analyse/messages.tsx"),
  ]),

  route("w/:id", "widget/scrape.tsx"),
  route("w/not-found", "widget/not-found.tsx"),
  route("embed.js", "embed-script.ts"),
] satisfies RouteConfig;

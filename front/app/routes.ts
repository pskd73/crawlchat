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

  index("landing-v2/page.tsx"),
  route("landing-old", "landing/page.tsx"),
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

  ...prefix("triggers", [route("weekly", "triggers/weekly.tsx")]),

  route("/logout", "auth/logout.tsx"),
  layout("dashboard/layout.tsx", [
    route("app", "dashboard/page.tsx"),
    route("profile", "dashboard/profile.tsx"),
    route("messages", "message/messages.tsx"),
    route("messages/:messageId/fix", "message/fix.tsx"),
    route("conversations", "conversations.tsx"),
    route("settings", "scrapes/settings.tsx"),
    route("tickets", "tickets.tsx"),

    route("integrations", "integrations/page.tsx", [
      index("integrations/embed.tsx"),
      route("mcp", "integrations/mcp.tsx"),
      route("discord", "integrations/discord.tsx"),
    ]),

    route("knowledge/group", "knowledge/new-group.tsx"),
    route("knowledge/group/:groupId", "knowledge/group/page.tsx", [
      index("knowledge/group/settings.tsx"),
      route("items", "knowledge/group/items.tsx"),
    ]),
    route("knowledge", "knowledge/groups.tsx"),
    route("knowledge/item/:itemId", "knowledge/link-item.tsx"),
  ]),

  route("blog/:slug", "blog/page.tsx"),
  route("blog", "blog/list.tsx"),

  route("w/:id", "widget/scrape.tsx"),
  route("s/:id", "widget/share.tsx"),
  route("ticket/:number", "widget/ticket.tsx"),
  route("w/not-found", "widget/not-found.tsx"),
  route("embed.js", "embed-script.ts"),
] satisfies RouteConfig;

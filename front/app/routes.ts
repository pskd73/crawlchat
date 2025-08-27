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

  route("auth/google", "auth/google.ts"),
  route("auth/google/callback", "auth/google-callback.ts"),

  route("terms", "landing/terms.tsx"),
  route("policy", "landing/policy.tsx"),
  route("embed-demo", "landing/embed-demo.tsx"),

  route("shopify-app-bot", "landing/shopify-app-bot.tsx"),

  route("payment/lemonsqueezy-webhook", "payment/lemonsqueezy-webhook.ts"),

  ...prefix("triggers", [
    route("weekly", "triggers/weekly.tsx"),
    route("setup-progress", "triggers/setup-progress.tsx"),
  ]),

  route("/logout", "auth/logout.tsx"),
  layout("dashboard/layout.tsx", [
    route("app", "dashboard/page.tsx"),
    route("profile", "dashboard/profile.tsx"),
    route("messages/:messageId/fix", "message/fix.tsx"),
    route("messages/conversations", "message/conversations.tsx"),
    route("settings", "scrapes/settings.tsx"),
    route("tickets", "tickets/list.tsx"),
    route("tickets/settings", "tickets/settings.tsx"),

    route("messages", "message/messages.tsx"),
    route("messages/:queryMessageId", "message/message.tsx"),

    route("connect", "integrations/page.tsx", [
      index("integrations/customise.tsx"),
      route("embed", "integrations/embed.tsx"),
      route("mcp", "integrations/mcp.tsx"),
      route("discord", "integrations/discord.tsx"),
      route("slack", "integrations/slack.tsx"),
    ]),

    route("knowledge/group", "knowledge/new-group.tsx"),
    route("knowledge/group/:groupId", "knowledge/group/page.tsx", [
      index("knowledge/group/settings.tsx"),
      route("items", "knowledge/group/items.tsx"),
    ]),
    route("knowledge", "knowledge/groups.tsx"),
    route("knowledge/item/:itemId", "knowledge/link-item.tsx"),

    route("team", "team/page.tsx"),

    route("setup-progress", "dashboard/setup-progress-api.ts"),

    route("actions", "actions/list.tsx"),
    route("actions/new", "actions/new.tsx"),
    route("actions/:actionId", "actions/edit.tsx"),

    route("data-gaps", "data-gaps/page.tsx"),
  ]),

  layout("landing/layout.tsx", [
    index("landing/page.tsx"),
    route("blog/:slug", "blog/page.tsx"),
    route("blog", "blog/list.tsx"),
    route("changelog", "changelog/list.tsx"),
    route("changelog/:slug", "changelog/page.tsx"),
    route("public-bots", "landing/public-bots.tsx"),

    route("discord-bot", "landing/discord-bot.tsx"),
    route("support-tickets", "landing/support-tickets.tsx"),

    route("pricing", "landing/pricing.tsx"),
  ]),

  ...prefix("admin-fowl", [index("admin/page.tsx")]),

  route("email-alert", "email-alert.ts"),

  route("w/:id", "widget/page.tsx"),
  route("s/:id", "widget/share.tsx"),
  route("w/:id/config", "widget/config.tsx"),
  route("ticket/:number", "widget/ticket.tsx"),
  route("w/not-found", "widget/not-found.tsx"),
  route("embed.js", "embed-script.ts"),
] satisfies RouteConfig;

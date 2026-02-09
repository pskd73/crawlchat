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

  route("terms", "landing/terms/page.tsx"),
  route("policy", "landing/policy/page.tsx"),
  route("data-privacy", "landing/data-privacy/page.tsx"),

  route("payment/lemonsqueezy-webhook", "payment/lemonsqueezy-webhook.ts"),
  route("payment/dodo-webhook", "payment/dodo-webhook.ts"),

  route("/logout", "auth/logout.tsx"),
  layout("layout.tsx", [
    route("app", "summary.tsx"),
    route("profile", "profile.tsx"),

    route("settings", "settings/scrape.tsx"),
    route("settings/helpdesk", "settings/helpdesk.tsx"),
    route("tickets", "tickets/list.tsx"),
    route("tickets/settings", "tickets/settings.tsx"),

    route("questions", "message/messages.tsx"),
    route("questions/:queryMessageId", "message/message.tsx"),
    route("questions/:messageId/fix", "message/fix.tsx"),

    route("questions/conversations", "message/conversations.tsx"),
    route(
      "questions/conversations/:conversationId",
      "message/conversation.tsx"
    ),
    route(
      "questions/conversations/:conversationId/make-guide",
      "message/make-guide.tsx"
    ),

    ...prefix("integrate", [
      route("customise", "integrations/customise.tsx"),
      route("web-embed", "integrations/embed.tsx"),
      route("mcp", "integrations/mcp.tsx"),
      route("discord-bot", "integrations/discord.tsx"),
      route("slack-app", "integrations/slack.tsx"),
      route("github-bot", "integrations/github-bot.tsx"),
      route("api", "integrations/api.tsx"),
    ]),

    route("knowledge/group", "knowledge/new-group.tsx"),
    route("knowledge/group/:groupId", "knowledge/group/page.tsx", [
      index("knowledge/group/settings.tsx"),
      route("items", "knowledge/group/items.tsx"),
    ]),
    route("knowledge", "knowledge/groups.tsx"),
    route("knowledge/item/:itemId", "knowledge/link-item.tsx"),

    route("team", "team/page.tsx"),

    route("setup-progress", "setup-progress/api.ts"),

    route("actions", "actions/list.tsx"),
    route("actions/new", "actions/new.tsx"),
    route("actions/:actionId", "actions/edit.tsx"),

    route("articles", "articles/list.tsx"),
    route("article/:id", "articles/page.tsx"),

    route("data-gaps", "data-gaps/page.tsx"),

    ...prefix("tool", [
      route("compose", "compose.tsx"),
      route("skill-maker", "skill-maker.tsx"),
      route("fact-check", "fact-check/page.tsx"),
      route("fact-check/api", "fact-check/api.ts"),
    ]),

    route("welcome", "welcome/page.tsx"),

    route("api-key", "api-key/page.tsx"),
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

    route("ai-models", "landing/ai-models.tsx"),

    route("pricing", "landing/pricing.tsx"),
    route("open-source", "landing/open-source.tsx"),

    ...prefix("use-case", [
      route("community-support", "landing/use-case/community-support.tsx"),
      route("empower-gtm-teams", "landing/use-case/empower-gtm-teams.tsx"),
      route("discord-bot", "landing/use-case/discord-bot.tsx"),
      route("mcp", "landing/use-case/mcp.tsx"),
    ]),

    route("case-study/:slug", "landing/case-study/page.tsx"),
  ]),

  ...prefix("admin-fowl", [
    index("admin/page.tsx"),
    route("user/:userId", "admin/user.tsx"),
    route("collection/:collectionId", "admin/collection.tsx"),
    route("update-customer-dodo", "admin/update-customer.ts"),
    route("change-plan-dodo", "admin/change-plan-dodo.ts"),
    route("subscription-details", "admin/subscription-details.ts"),
    route(
      "set-brand-removal-subscription",
      "admin/set-brand-removal-subscription.ts"
    ),
    route("activate-plan", "admin/activate-plan.ts"),
  ]),

  route("email-alert", "email-alert.ts"),

  layout("helpdesk/layout.tsx", [
    route("helpdesk/:slug", "helpdesk/page.tsx"),
    route("helpdesk/:slug/article/:id", "helpdesk/article.tsx"),
  ]),

  route("w/:id", "widget/page.tsx"),
  route("s/:id", "widget/share.tsx"),
  route("w/:id/config", "widget/config.tsx"),
  route("w/:id/group/:threadId", "widget/group.tsx"),
  route("ticket/:number", "widget/ticket.tsx"),
  route("w/not-found", "widget/not-found.tsx"),
  route("embed.js", "embed-script.ts"),
] satisfies RouteConfig;

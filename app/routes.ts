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

  route("/logout", "auth/logout.tsx"),
  layout("dashboard/layout.tsx", [
    route("app", "dashboard/page.tsx"),
    route("threads/new", "dashboard/thread-new.tsx"),
    route("threads/:id", "dashboard/thread.tsx"),
    route("collections", "scrapes/page.tsx"),
    route("settings", "dashboard/settings.tsx"),

    route("collections/:id", "scrapes/scrape-page.tsx", [
      route("settings", "scrapes/scrape-settings.tsx"),
      route("links", "scrapes/scrape-links.tsx"),
    ]),
  ]),

  route("w/:id", "widget/scrape.tsx"),
] satisfies RouteConfig;

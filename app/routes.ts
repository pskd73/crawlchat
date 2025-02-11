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
    route("email-sent", "auth/email-sent.tsx"),
    route("verify", "auth/verify.ts"),
  ]),

  route("/logout", "auth/logout.tsx"),
  layout("dashboard/layout.tsx", [
    route("app", "dashboard/page.tsx"),
    route("threads/:id", "dashboard/thread.tsx"),
  ]),

  route("test", "test.tsx"),
] satisfies RouteConfig;

import cn from "@meltdownjs/cn";
import { Outlet, useLocation, useParams } from "react-router";
import { Container } from "~/landing/page";
import type { Route } from "./+types/layout";
import { cache } from "./fetch";
import { buildChangelogMonthGroups } from "./month-groups";

export function loader(_args: Route.LoaderArgs) {
  const posts = cache
    .get()
    .slice()
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  const slugToMonthHref: Record<string, string> = {};
  for (const p of posts) {
    slugToMonthHref[p.slug] = `/changelog/${p.date.getFullYear()}/${
      p.date.getMonth() + 1
    }`;
  }
  return {
    totalCount: posts.length,
    monthGroups: buildChangelogMonthGroups(posts),
    slugToMonthHref,
  };
}

export default function ChangelogLayout({ loaderData }: Route.ComponentProps) {
  const location = useLocation();
  const params = useParams();
  const activeMonthHref =
    params.year && params.month
      ? `/changelog/${params.year}/${params.month}`
      : params.slug
        ? loaderData.slugToMonthHref[params.slug]
        : undefined;
  return (
    <div className="mt-16">
      <Container>
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
          <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-56 lg:self-start">
            <nav
              className="flex flex-col gap-1 text-sm"
              aria-label="Changelog archive"
            >
              <p className="mb-2 font-medium opacity-80">Archive</p>
              <a
                href="/changelog"
                className={cn(
                  "rounded-lg px-2 py-1.5 hover:bg-base-200",
                  location.pathname === "/changelog" &&
                    "bg-base-200 font-medium"
                )}
              >
                All updates ({loaderData.totalCount})
              </a>
              {loaderData.monthGroups.map((g) => (
                <a
                  key={`${g.year}-${g.month}`}
                  href={g.href}
                  className={cn(
                    "rounded-lg px-2 py-1.5 hover:bg-base-200",
                    (location.pathname === g.href ||
                      activeMonthHref === g.href) &&
                      "bg-base-200 font-medium"
                  )}
                >
                  {g.label}
                </a>
              ))}
            </nav>
          </aside>
          <div className="min-w-0 flex-1">
            <Outlet />
          </div>
        </div>
      </Container>
    </div>
  );
}

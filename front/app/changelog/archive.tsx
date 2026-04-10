import moment from "moment";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Heading } from "~/landing/page";
import { makeMeta } from "~/meta";
import type { Route } from "./+types/archive";
import { cache } from "./fetch";

function parseYearMonth(year: string, month: string) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || y < 1990 || y > 2100) {
    return null;
  }
  if (!Number.isInteger(m) || m < 1 || m > 12) {
    return null;
  }
  return { year: y, month: m };
}

export function loader({ params }: Route.LoaderArgs) {
  const parsed = parseYearMonth(params.year, params.month);
  if (!parsed) {
    throw new Response("Not found", { status: 404 });
  }
  const { year, month } = parsed;
  const posts = cache
    .get()
    .filter(
      (p) => p.date.getFullYear() === year && p.date.getMonth() + 1 === month
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  return { year, month, posts };
}

export function meta({ data }: Route.MetaArgs) {
  const label = moment({
    year: data.year,
    month: data.month - 1,
    day: 1,
  }).format("MMMM YYYY");
  return makeMeta({
    title: `${label} · Changelog - CrawlChat`,
    description: `CrawlChat changelog from ${label}.`,
  });
}

export default function ChangelogArchivePage({
  loaderData,
}: Route.ComponentProps) {
  const label = moment({
    year: loaderData.year,
    month: loaderData.month - 1,
    day: 1,
  }).format("MMMM YYYY");
  return (
    <>
      <Heading>{label}</Heading>
      <div className="mt-32 flex flex-col">
        {loaderData.posts.map((post) => (
          <div key={post.slug}>
            <div className="flex flex-col gap-2">
              <a
                className="text-3xl font-medium hover:underline"
                href={`/changelog/${post.slug}`}
              >
                {post.title}
              </a>
              <p className="opacity-60 text-sm">
                {moment(post.date).format("MMMM D, YYYY")}
              </p>
            </div>
            <p className="prose dark:prose-invert max-w-full w-full mt-4">
              <Markdown remarkPlugins={[remarkGfm]}>{post.markdown}</Markdown>
            </p>
            <div className="border-b-2 border-base-300 my-16 w-full" />
          </div>
        ))}
      </div>
    </>
  );
}

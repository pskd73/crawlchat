import { Container, Heading } from "~/landing/page";
import type { Route } from "./+types/list";
import { cache } from "./fetch";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import moment from "moment";

export function loader({}: Route.LoaderArgs) {
  return {
    posts: cache.get().sort((a, b) => b.date.getTime() - a.date.getTime()),
  };
}

export function meta() {
  return [
    {
      title: "Changelog - CrawlChat",
      description: "Read our changelog",
    },
  ];
}

export default function ChangelogPage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="mt-16">
      <Container>
        <Heading>Changelog</Heading>
        <div className="mt-32 flex flex-col items-center">
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
              <p className="prose dark:prose-invert mt-4">
                <Markdown remarkPlugins={[remarkGfm]}>{post.markdown}</Markdown>
              </p>
              <div className="border-b-2 border-outline my-16 max-w-prose" />
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}

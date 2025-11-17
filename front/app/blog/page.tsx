import { readPost } from "./posts";
import type { Route } from "./+types/page";
import { redirect } from "react-router";
import { Container } from "~/landing/page";
import { TbClock } from "react-icons/tb";
import moment from "moment";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { makeMeta } from "~/meta";

export function loader({ params }: Route.LoaderArgs) {
  try {
    return { post: readPost(params.slug) };
  } catch (error) {
    throw redirect(`/blog`);
  }
}

export function meta({ data }: Route.MetaArgs) {
  return makeMeta({
    title: data.post.title,
    description: data.post.description,
  });
}

export default function BlogPage({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Container>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 max-w-full mx-auto">
            <h1 className="text-5xl max-w-3xl mx-auto font-medium text-center leading-tight">
              {loaderData.post.title}
            </h1>
            <p className="opacity-60 text-center text-lg max-w-3xl mx-auto">
              {loaderData.post.description}
            </p>

            <div className="flex items-center justify-center gap-2 text-sm opacity-60 text-center">
              <TbClock />
              {moment(loaderData.post.date).format("MMMM D, YYYY")}
            </div>
          </div>

          {loaderData.post.image && (
              <div className="flex items-center justify-center">
                <img
                  src={loaderData.post.image}
                  alt={loaderData.post.title}
                  className="w-full max-w-3xl mx-auto"
                />
              </div>
            )}

          <div className="prose dark:prose-invert mx-auto mt-20 max-w-3xl">
            <Markdown remarkPlugins={[remarkGfm]}>
              {loaderData.post.markdown}
            </Markdown>
          </div>
        </div>
      </Container>
    </>
  );
}

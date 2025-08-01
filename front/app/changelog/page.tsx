import { readPost } from "~/blog/posts";
import type { Route } from "./+types/page";
import { redirect } from "react-router";
import { Container } from "~/landing/page";
import { TbClock } from "react-icons/tb";
import moment from "moment";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function loader({ params }: Route.LoaderArgs) {
  try {
    return { post: readPost(params.slug, "changelog") };
  } catch (error) {
    throw redirect(`/blog`);
  }
}

export function meta({ data }: Route.MetaArgs) {
  return [
    {
      title: data.post.title,
      description: data.post.description,
    },
  ];
}

export default function BlogPage({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Container>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 max-w-[760px] mx-auto">
            <h1 className="text-5xl font-medium text-center leading-tight">
              {loaderData.post.title}
            </h1>
            <p className="opacity-60 text-center text-lg">
              {loaderData.post.description}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm opacity-60 text-center">
              <TbClock />
              {moment(loaderData.post.date).format("MMMM D, YYYY")}
            </div>
          </div>

          <div className="prose dark:prose-invert mx-auto mt-10">
            <Markdown remarkPlugins={[remarkGfm]}>
              {loaderData.post.markdown}
            </Markdown>
          </div>
        </div>
      </Container>
    </>
  );
}

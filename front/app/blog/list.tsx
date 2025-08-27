import { readPosts } from "./posts";
import { Cache } from "~/cache";
import type { Route } from "./+types/list";
import { TbClock, TbSignature } from "react-icons/tb";
import { LandingPage, Container, Nav, CTA, Footer } from "~/landing/page";
import moment from "moment";

const cache = new Cache(
  () => readPosts().filter((b) => b.type === "blog"),
  5 * 60 * 1000
);

export function loader() {
  return { posts: cache.get().filter((b) => b.status === "published") };
}

export function meta() {
  return [
    {
      title: "Blog - CrawlChat",
      description: "Read our blog posts",
    },
  ];
}

export default function BlogPage({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Container>
        <h2 className="text-2xl font-medium flex items-center gap-2 mb-8">
          <TbSignature />
          Blog
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loaderData.posts.map((post) => (
            <a
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="flex flex-col bg-base-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <img
                  src={post.image ?? "/blog-images/post/blog-post.png"}
                  alt={post.title}
                  className="w-full"
                />
              </div>
              <div className="flex flex-col gap-2 p-6">
                <h2 className="text-lg font-medium">{post.title}</h2>
                <p className="text-sm opacity-60">{post.description}</p>
                <div className="flex items-center gap-2 text-sm opacity-60">
                  <TbClock />
                  {moment(post.date).format("MMMM D, YYYY")}
                </div>
              </div>
            </a>
          ))}
        </div>
      </Container>
    </>
  );
}

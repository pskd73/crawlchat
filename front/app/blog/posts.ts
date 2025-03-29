import fs from "fs";

export type BlogPost = {
  title: string;
  slug: string;
  markdown: string;
  meta: Record<string, string>;
  date: Date;
  description: string;
};

function getPostsPath() {
  return process.env.NODE_ENV === "development"
    ? "public/blog-posts"
    : "build/client/blog-posts";
}

function extractFrontmMtter(content: string) {
  let frontMatter: Record<string, string> = {};
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);

  if (frontMatterMatch) {
    const frontMatterContent = frontMatterMatch[1];
    frontMatterContent.split("\n").forEach((line) => {
      const [key, value] = line.split(":").map((part) => part.trim());
      if (key && value) {
        frontMatter[key] = value;
      }
    });
  }

  const markdown = content
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/^\n+/, "");
  return { frontMatter, markdown };
}

export function readPost(slug: string): BlogPost {
  const content = fs.readFileSync(`${getPostsPath()}/${slug}.md`, "utf8");

  const { frontMatter, markdown } = extractFrontmMtter(content);

  return {
    title: frontMatter.title,
    slug,
    markdown,
    date: new Date(frontMatter.date),
    meta: frontMatter,
    description: frontMatter.description,
  };
}

export function readPosts() {
  const path = getPostsPath();
  const postsDir = fs.readdirSync(path);
  const posts: BlogPost[] = [];

  for (const file of postsDir) {
    if (file.endsWith(".md")) {
      const slug = file.replace(".md", "");
      posts.push(readPost(slug));
    }
  }

  return posts;
}

import { GridItem, Group, Heading, SimpleGrid, Stack } from "@chakra-ui/react";
import { Container, CTA, Footer, Navbar } from "~/landing/page";
import { readPosts } from "./posts";
import { Cache } from "~/cache";
import { BlogPostCard } from "./card";
import type { Route } from "./+types/list";
import { useMemo } from "react";
import { TbSignature } from "react-icons/tb";

const cache = new Cache(() => readPosts(), 5 * 60 * 1000);

export function loader() {
  return { posts: cache.get() };
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
  const randomNumbers = useMemo(
    () => Array.from(Array(100)).map(() => Math.floor(Math.random() * 6)),
    []
  );

  return (
    <Stack gap={0} w="full">
      <Navbar />

      <Stack my={10} px={8}>
        <Container>
          <Stack w="full" gap={10}>
            <Group gap={2} alignItems="center">
              <TbSignature size={32} />
              <Heading size={"3xl"}>Blog</Heading>
            </Group>

            <SimpleGrid columns={[1, 2, 3]} w="full" gap={6}>
              {loaderData.posts.map((post, index) => (
                <GridItem key={post.slug}>
                  <BlogPostCard post={post} bgPattern={randomNumbers[index]} />
                </GridItem>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Stack>

      <CTA />
      <Footer />
    </Stack>
  );
}

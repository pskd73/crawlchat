import { Group, Heading, Stack, Text } from "@chakra-ui/react";
import { Container, CTA, Footer, Navbar } from "~/landing/page";
import { readPost } from "./posts";
import type { Route } from "./+types/page";
import { TbArrowLeft, TbClock } from "react-icons/tb";
import moment from "moment";
import { MarkdownProse } from "~/widget/markdown-prose";
import { Button } from "~/components/ui/button";
import { Link, redirect } from "react-router";

export function loader({ params }: Route.LoaderArgs) {
  try {
    return { post: readPost(params.slug) };
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
    <Stack gap={0} w="full">
      <Navbar />

      <Stack my={10} px={8}>
        <Container>
          <Stack w="full" maxW="800px" mx="auto">
            <Stack w="full" gap={10} alignItems={"center"} maxW="800px">
              <Stack w="full" alignItems={"center"}>
                <Heading size={"5xl"} textAlign={"center"}>
                  {loaderData.post.title}
                </Heading>
                <Group>
                  <TbClock />
                  <Text>
                    {moment(loaderData.post.date).format("MMMM D, YYYY")}
                  </Text>
                </Group>
                <Button variant={"subtle"} asChild>
                  <Link to="/blog">
                    <TbArrowLeft />
                    All blog posts
                  </Link>
                </Button>
              </Stack>

              <Stack alignItems={"center"} w="full">
                <Stack w="full">
                  <MarkdownProse>{loaderData.post.markdown}</MarkdownProse>
                </Stack>
              </Stack>
            </Stack>
          </Stack>
        </Container>
      </Stack>

      <CTA />
      <Footer />
    </Stack>
  );
}

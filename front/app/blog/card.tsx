import { Box, Group, Heading, Stack, Text } from "@chakra-ui/react";
import type { BlogPost } from "./posts";
import "./card-bg.css";
import moment from "moment";
import { TbClock } from "react-icons/tb";

export function BlogPostCard({
  post,
  bgPattern = 0,
}: {
  post: BlogPost;
  bgPattern?: number;
}) {
  return (
    <Stack
      w="full"
      border="1px solid"
      borderColor={"brand.outline"}
      rounded={"lg"}
      overflow={"hidden"}
      gap={0}
      as="a"
      href={`/blog/${post.slug}`}
      shadow={"xs"}
      transition={"all 200ms ease"}
      _hover={{
        shadow: "lg",
      }}
    >
      <Box h="160px" className={`card-bg-${bgPattern}`} />
      <Stack p={4} shadow={"xl"}>
        <Heading size={"lg"}>{post.title}</Heading>
        <Text>{post.description}</Text>
        <Group fontSize={"sm"} opacity={0.5}>
          <TbClock />
          <Text>{moment(post.date).format("MMMM D, YYYY")}</Text>
        </Group>
      </Stack>
    </Stack>
  );
}

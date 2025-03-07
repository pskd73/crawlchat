import {
  Flex,
  Heading,
  Stack,
  Text,
  Highlight,
  Image,
  List,
  Center,
} from "@chakra-ui/react";
import { Container, CTA, Footer, Navbar, Pricing } from "../page";
import { CustomListItem } from "./embed";

export function meta() {
  return [
    {
      title: "MCP server for your documentation - CrawlChat",
      description: "Chat with Any Website using AI",
    },
  ];
}

export default function Embed() {
  return (
    <Stack gap={0} w="full">
      <Navbar />
      <Stack w={"full"} px={8} py={12} id="pricing">
        <Container>
          <Flex
            w={"full"}
            gap={12}
            direction={["column", "column", "column", "row"]}
          >
            <Stack flex={1} gap={8}>
              <Heading size={["5xl", "7xl"]} as="h1">
                <Text>
                  <Highlight
                    query={["Discord bot"]}
                    styles={{ bg: "brand.fg", color: "brand.white", px: 2 }}
                  >
                    Discord bot to answer questions!
                  </Highlight>
                </Text>
              </Heading>
              <Text as="h2" fontSize={"xl"} opacity={0.6}>
                Discord is the best place to build a community for your
                customers so then they can get continues support. Often, your
                support team spends lot of time answering questions on the
                server. CrawlChat has a ready to use Discord Bot that can answer
                all the questions and also learn from the conversations!
              </Text>
              <List.Root gap="2" variant="plain" align="center" fontSize={"xl"}>
                <CustomListItem>
                  Scrape your own documentation or content
                </CustomListItem>
                <CustomListItem>
                  Setup server id & install the bot
                </CustomListItem>
                <CustomListItem>
                  Tag @crawlchat to answer questions and also learn
                </CustomListItem>
              </List.Root>
            </Stack>
            <Stack flex={1}>
              <Center
                bg="brand.subtle"
                w={"full"}
                h={"full"}
                rounded={"xl"}
                p={8}
              >
                <Image
                  src="/discord-bot.png"
                  alt="Discord bot"
                  rounded={"xl"}
                  maxW={"90%"}
                  objectFit={"contain"}
                />
              </Center>
            </Stack>
          </Flex>
        </Container>
      </Stack>

      <Pricing />
      <CTA />
      <Footer />
    </Stack>
  );
}

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
                    query={["MCP server"]}
                    styles={{ bg: "brand.fg", color: "brand.white", px: 2 }}
                  >
                    MCP server for your documentation!
                  </Highlight>
                </Text>
              </Heading>
              <Text as="h2" fontSize={"xl"} opacity={0.6}>
                MCP has been the standard protocol for interacting with AI
                applications such as Claude, Cursor or Windsurf. Lot of people
                and developers around the world are adopting MCP servers
                quickly. You can host MCP server for your documentation without
                any efforts!
              </Text>
              <List.Root gap="2" variant="plain" align="center" fontSize={"xl"}>
                <CustomListItem>
                  Scrape your own documentation or content
                </CustomListItem>
                <CustomListItem>Get the MCP server command</CustomListItem>
                <CustomListItem>
                  Share the MCP command with your customers
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
                  src="/mcp.png"
                  alt="MCP server"
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

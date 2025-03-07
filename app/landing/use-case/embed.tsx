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
import { TbCircleCheck } from "react-icons/tb";

export function meta() {
  return [
    {
      title: "Embed CrawlChat on your website",
      description: "Chat with Any Website using AI",
    },
  ];
}

export function CustomListItem({ children }: { children: React.ReactNode }) {
  return (
    <List.Item alignItems={"start"}>
      <List.Indicator asChild color="green.500">
        <TbCircleCheck />
      </List.Indicator>
      <Text opacity={0.6}>{children}</Text>
    </List.Item>
  );
}

export default function Embed() {
  return (
    <Stack gap={0} w="full">
      <Navbar />
      <Stack w={"full"} px={8} py={12} id="pricing">
        <Container>
          <Flex
            w={"full"}
            direction={["column", "column", "column", "row"]}
            gap={12}
          >
            <Stack flex={1} gap={8}>
              <Heading size={["5xl", "7xl"]} as="h1">
                <Text>
                  <Highlight
                    query={["Ask AI"]}
                    styles={{ bg: "brand.fg", color: "brand.white", px: 2 }}
                  >
                    Effortlessly add Ask AI to your website!
                  </Highlight>
                </Text>
              </Heading>
              <Text as="h2" fontSize={"xl"} opacity={0.6}>
                As the world is adopting AI, it is important to make your
                content to be accessible through AI to your customers. CrawlChat
                lets you embed the chat box on your website and let your
                customers ask questions against your own documentation or
                content.
              </Text>
              <List.Root gap="2" variant="plain" align="center" fontSize={"xl"}>
                <CustomListItem>
                  Scrape your own documentation or content
                </CustomListItem>
                <CustomListItem>
                  Get the embed code and paste it on your website
                </CustomListItem>
                <CustomListItem>
                  Let your customers ask questions against your own
                  documentation or content
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
                  src="/embed-box.png"
                  alt="Embed"
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

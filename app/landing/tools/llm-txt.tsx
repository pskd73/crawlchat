import {
  Box,
  Heading,
  Text,
  Stack,
  Group,
  Input,
  Spinner,
  Image,
} from "@chakra-ui/react";
import {
  TbArrowRight,
  TbCheck,
  TbCode,
  TbDownload,
  TbInfoCircle,
  TbMessage,
  TbRobotFace,
} from "react-icons/tb";
import { Button } from "~/components/ui/button";
import { useOpenScrape } from "~/landing/use-open-scrape";

export function meta() {
  return [
    {
      title: "Make LLM.txt - CrawlChat",
      description:
        "LLM.txt is a specially formatted text file that contains the scraped content from a website in a format that's optimized for Large Language Models.",
    },
  ];
}

export default function LLMTxt() {
  const { roomId, scrapeFetcher, disable, scraping, stage } = useOpenScrape();

  return (
    <Stack maxW="3xl" mx="auto" p={6}>
      <Stack justifyContent={"center"} alignItems={"center"} mb={8}>
        <Group>
          <Image src="/logo.png" alt="CrawlChat" w={10} />
          <Heading size="2xl" color="brand.fg">
            CrawlChat
          </Heading>
        </Group>
      </Stack>
      <Stack gap={8}>
        <Stack>
          <scrapeFetcher.Form method="post" action="/open-scrape">
            <input
              type="hidden"
              name="intent"
              value={stage === "saved" ? "llm.txt" : "scrape"}
            />
            <input type="hidden" name="roomId" value={roomId} />
            <input
              type="hidden"
              name="scrapeId"
              value={scrapeFetcher.data?.scrapeId}
            />
            <Group w="full">
              <Input
                name="url"
                type="url"
                placeholder="Ex: https://www.google.com"
                size={"2xl"}
                disabled={disable}
              />
              <Button
                type="submit"
                size={"2xl"}
                disabled={stage === "saved" ? false : disable}
                colorPalette={stage === "saved" ? "brand" : undefined}
              >
                {stage === "saved" ? "Download" : "Start"}
                {stage === "saved" ? <TbDownload /> : <TbCheck />}
              </Button>
            </Group>
          </scrapeFetcher.Form>
          <Group opacity={0.5}>
            {stage === "idle" && (
              <>
                <TbInfoCircle />
                <Text truncate>
                  Scrapes first 25 pages visible from above URL.
                </Text>
              </>
            )}
            {stage === "scraping" && (
              <>
                <Spinner size={"sm"} color={"brand"} borderWidth={"3px"} />
                <Text truncate>Scraping {scraping?.url ?? "url..."}</Text>
              </>
            )}
            {stage === "saved" && (
              <>
                <TbCheck />
                <Text truncate>Ready to download!</Text>
              </>
            )}
          </Group>
        </Stack>

        <Box bg="brand.gray.100" p={6} borderRadius="md">
          <Heading size="xl" mb={4}>
            What is LLM.txt?
          </Heading>
          <Text>
            LLM.txt is a specially formatted text file that contains the scraped
            content from a website in a format that's optimized for Large
            Language Models. This file can be used for training, fine-tuning, or
            as context for AI models to better understand the content of a
            specific website.
          </Text>
        </Box>
      </Stack>

      <Stack
        p={6}
        borderRadius="md"
        alignItems={"center"}
        border={"1px solid"}
        borderColor="brand.subtle"
        mt={8}
        bgGradient={"to-t"}
        gradientFrom={"brand.100"}
        gradientTo={"brand.200"}
        gap={6}
      >
        <Heading size="4xl" color="brand.fg">
          Want to make it LLM ready?
        </Heading>

        <Group gap={10} opacity={0.5}>
          <Group>
            <TbCode />
            <Text>Embed chat</Text>
          </Group>

          <Group>
            <TbMessage />
            <Text>Share chat link</Text>
          </Group>

          <Group>
            <TbCode />
            <Text>RAG API</Text>
          </Group>

          <Group>
            <TbRobotFace />
            <Text>MCP</Text>
          </Group>
        </Group>

        <Button colorPalette={"brand"} size={"xl"} asChild>
          <a href="/login" target="_blank">
            Get started
            <TbArrowRight />
          </a>
        </Button>
      </Stack>
    </Stack>
  );
}

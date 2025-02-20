import {
  Badge,
  Center,
  createListCollection,
  GridItem,
  Group,
  Heading,
  Input,
  Separator,
  SimpleGrid,
  Stack,
  Text,
  Link as ChakraLink,
  Flex,
} from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { useState } from "react";
import type { Route } from "./+types/page";
import {
  TbCheck,
  TbChevronDown,
  TbChevronUp,
  TbCircleCheckFilled,
  TbHome,
} from "react-icons/tb";
import { Link, redirect, useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "~/prisma";
import { Field } from "~/components/ui/field";
import {
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "~/components/ui/select";
import { ScrapeCard } from "~/scrapes/card";
import { Page } from "~/components/page";
import { createToken } from "~/jwt";
import { makeMessage } from "./socket-util";
import { toaster } from "~/components/ui/toaster";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapes = await prisma.scrape.findMany({
    where: {
      userId: user?.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  const itemsCount: Record<string, number> = {};
  for (const scrape of scrapes) {
    itemsCount[scrape.id] = await prisma.scrapeItem.count({
      where: {
        scrapeId: scrape.id,
      },
    });
  }
  return {
    user,
    scrapes,
    token: createToken(user!.id),
    itemsCount,
  };
}

export function meta() {
  return [
    {
      title: "CrawlChat",
      description: "Chat with any website!",
    },
  ];
}

export async function action({ request }: { request: Request }) {
  const user = await getAuthUser(request);
  const formData = await request.formData();

  if (request.method === "POST") {
    const url = formData.get("url");
    const maxLinks = formData.get("maxLinks");
    const skipRegex = formData.get("skipRegex");

    if (!url) {
      return { error: "URL is required" };
    }

    const scrape = await prisma.scrape.create({
      data: {
        url: url as string,
        userId: user!.id,
        status: "pending",
      },
    });

    const token = createToken(user!.id);

    const response = await fetch(`${process.env.VITE_SERVER_URL}/scrape`, {
      method: "POST",
      body: JSON.stringify({ maxLinks, skipRegex, scrapeId: scrape.id }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 212) {
      const json = await response.json();
      throw redirect(`/threads/new?id=${json.scrapeId}`);
    }
  }
}

const maxLinks = createListCollection({
  items: [
    { label: "10 links", value: "10" },
    { label: "50 links", value: "50" },
    { label: "100 links", value: "100" },
    { label: "500 links", value: "500" },
    { label: "1000 links", value: "1000" },
  ],
});

export default function LandingPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const socket = useRef<WebSocket>(null);
  const [scraping, setScraping] = useState<{
    url: string;
    remainingCount: number;
    scrapedCount: number;
  }>();
  const [stage, setStage] = useState<"idle" | "scraping" | "scraped" | "saved">(
    "idle"
  );
  const scrapeFetcher = useFetcher();
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    socket.current = new WebSocket(import.meta.env.VITE_SERVER_WS_URL);
    socket.current.onopen = () => {
      socket.current?.send(
        makeMessage("join-room", {
          headers: {
            Authorization: `Bearer ${loaderData.token}`,
          },
        })
      );
    };
    socket.current.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "scrape-start") {
        setStage("scraping");
      }

      if (message.type === "scrape-pre") {
        setScraping({
          url: message.data.url,
          remainingCount: message.data.remainingUrlCount,
          scrapedCount: message.data.scrapedUrlCount,
        });
        setStage("scraping");
      }

      if (message.type === "scrape-complete") {
        setStage("scraped");
      }

      if (message.type === "saved") {
        setStage("saved");
      }

      if (message.type === "error") {
        toaster.error({
          title: "Failed to connect",
          description: message.data.message,
        });
      }
    };
  }, []);

  const loading =
    scrapeFetcher.state !== "idle" || ["scraping", "scraped"].includes(stage);
  const cardsToShow = 4;

  return (
    <Page title="Home" icon={<TbHome />}>
      <Stack
        alignItems={"center"}
        justifyContent={"center"}
        height={"100%"}
        gap={8}
      >
        <Stack maxW={"400px"} w={"full"}>
          <scrapeFetcher.Form method="post">
            <Stack>
              <Heading>Chat with any website!</Heading>
              <Flex w="full" flexDir={["column", "row", "row", "row"]} gap={2}>
                <Input
                  placeholder="https://example.com"
                  name="url"
                  disabled={loading}
                />
                <Button type="submit" loading={loading} colorPalette={"brand"}>
                  Scrape
                  <TbCheck />
                </Button>
              </Flex>

              {advanced && (
                <>
                  <Separator my={4} />

                  <Stack gap={4}>
                    <Field label="Skip">
                      <Input
                        name="skipRegex"
                        placeholder="Ex: /blog or /docs/v1"
                      />
                    </Field>
                    <SelectRoot name="maxLinks" collection={maxLinks}>
                      <SelectLabel>Select max links</SelectLabel>
                      <SelectTrigger>
                        <SelectValueText placeholder="Select max links" />
                      </SelectTrigger>
                      <SelectContent>
                        {maxLinks.items.map((maxLink) => (
                          <SelectItem item={maxLink} key={maxLink.value}>
                            {maxLink.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectRoot>
                  </Stack>
                </>
              )}

              <Center>
                <Button
                  variant={"ghost"}
                  size={"xs"}
                  onClick={() => setAdvanced(!advanced)}
                >
                  {advanced ? "Simple" : "Advanced"}
                  {advanced ? <TbChevronUp /> : <TbChevronDown />}
                </Button>
              </Center>
            </Stack>
          </scrapeFetcher.Form>

          <Stack fontSize={"sm"}>
            <Group justifyContent={"space-between"}>
              {stage === "scraping" && (
                <>
                  <Text truncate display={["none", "block"]}>
                    Scraping {scraping?.url}
                  </Text>
                  <Text truncate display={["block", "none"]}>
                    Scraping...
                  </Text>
                </>
              )}
              {scraping?.url && stage === "scraped" && (
                <Text>Scraping complete</Text>
              )}
              {scraping?.url && stage === "saved" && (
                <Group gap={1}>
                  <Text>Done</Text>
                  <Text color={"brand.fg"}>
                    <TbCircleCheckFilled />
                  </Text>
                </Group>
              )}

              {scraping && (
                <Group>
                  <Badge>
                    {scraping?.scrapedCount} /{" "}
                    {scraping?.scrapedCount + scraping?.remainingCount}
                  </Badge>
                </Group>
              )}
            </Group>
          </Stack>
        </Stack>

        <Stack maxW={"400px"} w={"full"}>
          <SimpleGrid columns={2} gap={4}>
            {loaderData.scrapes.slice(0, cardsToShow).map((scrape) => (
              <GridItem key={scrape.id}>
                <ScrapeCard
                  scrape={scrape}
                  itemsCount={loaderData.itemsCount[scrape.id]}
                />
              </GridItem>
            ))}
          </SimpleGrid>
          <Group justifyContent={"flex-end"}>
            {loaderData.scrapes.length > cardsToShow && (
              <ChakraLink asChild variant={"underline"}>
                <Link to="/collections">View all</Link>
              </ChakraLink>
            )}
          </Group>
        </Stack>
      </Stack>
    </Page>
  );
}

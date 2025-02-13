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
  return {
    user,
    scrapes,
  };
}

export function meta() {
  return [
    {
      title: "Kaho",
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

    const response = await fetch("http://localhost:3000/scrape", {
      method: "POST",
      body: JSON.stringify({ url, maxLinks, skipRegex }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${createToken(user!.id)}`,
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
    socket.current = new WebSocket("ws://localhost:3000");
    socket.current.onopen = () => {
      socket.current?.send(
        JSON.stringify({
          type: "join-room",
          data: { userId: loaderData.user!.id },
        })
      );
    };
    socket.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "scrape-pre") {
        setScraping({
          url: message.data.url,
          remainingCount: message.data.remainingUrlCount,
          scrapedCount: message.data.scrapedUrlCount,
        });
        setStage("scraping");
      } else if (message.type === "scrape-complete") {
        setStage("scraped");
      } else if (message.type === "saved") {
        setStage("saved");
      }
    };
  }, []);

  const loading =
    scrapeFetcher.state !== "idle" || ["scraping", "scraped"].includes(stage);

  return (
    <Page title="Home" icon={<TbHome />}>
      <Stack
        alignItems={"center"}
        justifyContent={"center"}
        height={"100dvh"}
        gap={8}
      >
        <Stack w={"400px"}>
          <scrapeFetcher.Form method="post">
            <Stack>
              <Heading>Chat with any website!</Heading>
              <Group w="full">
                <Input
                  placeholder="https://example.com"
                  flex={1}
                  name="url"
                  disabled={loading}
                />
                <Button type="submit" loading={loading}>
                  Scrape
                  <TbCheck />
                </Button>
              </Group>

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
                <Text truncate>Scraping {scraping?.url}</Text>
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

        <Stack w={"400px"}>
          <SimpleGrid columns={2} gap={4}>
            {loaderData.scrapes.slice(0, 4).map((scrape) => (
              <GridItem key={scrape.id}>
                <ScrapeCard scrape={scrape} />
              </GridItem>
            ))}
          </SimpleGrid>
          <Group justifyContent={"flex-end"}>
            <ChakraLink asChild variant={"underline"}>
              <Link to="/collections">View all</Link>
            </ChakraLink>
          </Group>
        </Stack>
      </Stack>
    </Page>
  );
}

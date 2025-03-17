import {
  Group,
  Stack,
  Text,
  Badge,
  EmptyState,
  VStack,
  Heading,
  List,
  Link,
  NativeSelect,
  Flex,
  Box,
  NumberInput,
  Center,
  createListCollection,
} from "@chakra-ui/react";
import {
  TbAlertTriangle,
  TbBox,
  TbCheck,
  TbLink,
  TbMessage,
} from "react-icons/tb";
import { Page } from "~/components/page";
import type { Route } from "./+types/messages";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "~/prisma";
import type { Message, MessageSourceLink, Prisma } from "libs/prisma";
import { MarkdownProse } from "~/widget/markdown-prose";
import {
  AccordionItem,
  AccordionItemContent,
  AccordionItemTrigger,
  AccordionRoot,
} from "~/components/ui/accordion";
import moment from "moment";
import { truncate } from "~/util";
import {
  NumberInputField,
  NumberInputRoot,
} from "~/components/ui/number-input";
import { Button } from "~/components/ui/button";
import { useFetcher } from "react-router";
import { useEffect, useMemo, useState } from "react";
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "~/components/ui/select";
import { StatCard } from "~/dashboard/page";

type MessagePair = {
  scrapeId: string;
  queryMessage?: Message;
  responseMessage: Message;
  maxScore: number;
  minScore: number;
  uniqueLinks: MessageSourceLink[];
};

type MessagePairWithThread = Prisma.MessageGetPayload<{
  include: {
    thread: true;
  };
}>;

function makeMessagePairs(messages: MessagePairWithThread[]) {
  function findUserMessage(i: number, threadId: string) {
    for (let j = i; j >= 0; j--) {
      if (messages[j].threadId !== threadId) {
        continue;
      }
      if ((messages[j].llmMessage as any).role === "user") {
        return messages[j];
      }
    }
  }

  const messagePairs: MessagePair[] = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const { links } = message;
    if ((message.llmMessage as any).role === "user") {
      continue;
    }
    const maxScore = Math.max(
      ...links.filter((l) => l.score !== null).map((l) => l.score!)
    );
    const minScore = Math.min(
      ...links.filter((l) => l.score !== null).map((l) => l.score!)
    );

    messagePairs.push({
      scrapeId: message.thread.scrapeId,
      queryMessage: findUserMessage(i, message.threadId),
      responseMessage: message,
      maxScore,
      minScore,
      uniqueLinks: links
        .filter((l) => l.score !== null)
        .filter(
          (u, i, a) =>
            i === a.findIndex((u2) => u2.scrapeItemId === u.scrapeItemId)
        ),
    });
  }

  return messagePairs.sort(
    (a, b) =>
      (b.responseMessage.createdAt?.getTime() ?? 0) -
      (a.responseMessage.createdAt?.getTime() ?? 0)
  );
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  const ONE_WEEK_AGO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

  const messages = await prisma.message.findMany({
    where: {
      ownerUserId: user!.id,
      createdAt: {
        gte: ONE_WEEK_AGO,
      },
    },
    include: {
      thread: true,
    },
  });

  const scrapes = await prisma.scrape.findMany({
    where: {
      userId: user!.id,
    },
  });

  return { messagePairs: makeMessagePairs(messages), scrapes };
}

export default function Messages({ loaderData }: Route.ComponentProps) {
  const [pairs, setPairs] = useState(loaderData.messagePairs);
  const [filter, setFilter] = useState<"gt" | "lt">("gt");
  const [score, setScore] = useState<number>();
  const [scrapeId, setScrapeId] = useState<string>();
  const [metrics, setMetrics] = useState<{
    poorResponses: number;
    bestResponses: number;
  }>({
    poorResponses: 0,
    bestResponses: 0,
  });
  const scrapesCollection = useMemo(
    () =>
      createListCollection({
        items: loaderData.scrapes.map((scrape) => ({
          label: scrape.title ?? scrape.url ?? "Untitled",
          value: scrape.id,
        })),
      }),
    [loaderData.scrapes]
  );

  useEffect(() => {
    let pairs = loaderData.messagePairs;

    if (filter && score !== undefined) {
      if (filter === "gt") {
        pairs = pairs
          .filter((p) => p.uniqueLinks.length > 0)
          .filter((p) => p.minScore > score);
      } else {
        pairs = pairs
          .filter((p) => p.uniqueLinks.length > 0)
          .filter((p) => p.maxScore < score);
      }
    }

    if (scrapeId) {
      pairs = pairs.filter((p) => p.scrapeId === scrapeId);
    }

    setPairs(pairs);
    setMetrics({
      poorResponses: pairs.filter((p) => p.minScore < 0.3).length,
      bestResponses: pairs.filter((p) => p.maxScore > 0.7).length,
    });
  }, [filter, score, scrapeId, loaderData.messagePairs]);

  function getScoreColor(score: number) {
    if (score < 0.2) {
      return "red";
    }
    if (score < 0.6) {
      return "orange";
    }
    return "brand";
  }

  return (
    <Page title="Messages" icon={<TbMessage />}>
      <Stack>
        {loaderData.messagePairs.length === 0 && (
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Indicator>
                <TbMessage />
              </EmptyState.Indicator>
              <VStack textAlign="center">
                <EmptyState.Title>No messages yet!</EmptyState.Title>
                <EmptyState.Description maxW={"lg"}>
                  Embed the chatbot, use MCP server or the Discord Bot to let
                  your customers talk with your documentation.
                </EmptyState.Description>
              </VStack>
            </EmptyState.Content>
          </EmptyState.Root>
        )}
        {loaderData.messagePairs.length > 0 && (
          <Stack>
            <Flex justifyContent={"flex-end"} gap={2}>
              <Box>
                <SelectRoot
                  collection={scrapesCollection}
                  w="300px"
                  value={scrapeId ? [scrapeId] : []}
                  onValueChange={(e) => setScrapeId(e.value[0])}
                >
                  <SelectTrigger clearable>
                    <SelectValueText placeholder="Select collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {scrapesCollection.items.map((item) => (
                      <SelectItem item={item} key={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </Box>
              <Box>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as "gt" | "lt")}
                  >
                    <option value="gt">Greater than</option>
                    <option value="lt">Less than</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Box>
              <Box>
                <NumberInputRoot w="80px">
                  <NumberInputField
                    placeholder="Ex 1"
                    value={score !== undefined ? score.toString() : ""}
                    onChange={(e) =>
                      setScore(
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  />
                </NumberInputRoot>
              </Box>
            </Flex>

            <Flex gap={2}>
              <StatCard
                label="Conversations"
                value={pairs.length}
                icon={<TbAlertTriangle />}
              />
              <StatCard
                label="Poor responses"
                value={metrics.poorResponses}
                icon={<TbAlertTriangle />}
              />
              <StatCard
                label="Best responses"
                value={metrics.bestResponses}
                icon={<TbCheck />}
              />
            </Flex>

            {pairs.length === 0 && (
              <Center my={8} flexDir={"column"} gap={2}>
                <Text fontSize={"6xl"} opacity={0.5}>
                  <TbBox />
                </Text>
                <Text textAlign={"center"}>No messages for the filter</Text>
              </Center>
            )}

            {pairs.length > 0 && (
              <AccordionRoot
                collapsible
                defaultValue={["b"]}
                variant={"enclosed"}
              >
                {pairs.map((pair, index) => (
                  <AccordionItem key={index} value={index.toString()}>
                    <AccordionItemTrigger>
                      <Group justifyContent={"space-between"} flex={1}>
                        <Group>
                          <Text maxW={"50vw"} truncate>
                            {truncate(
                              (pair.queryMessage?.llmMessage as any).content,
                              10000
                            )}
                          </Text>
                          <Text opacity={0.2} hideBelow={"md"}>
                            {moment(pair.queryMessage?.createdAt).fromNow()}
                          </Text>
                        </Group>
                        <Group>
                          {pair.uniqueLinks.length > 0 && (
                            <Badge
                              colorPalette={getScoreColor(pair.maxScore)}
                              variant={"surface"}
                            >
                              {pair.minScore.toFixed(2)} -{" "}
                              {pair.maxScore.toFixed(2)}
                            </Badge>
                          )}
                        </Group>
                      </Group>
                    </AccordionItemTrigger>
                    <AccordionItemContent>
                      <Stack gap={4}>
                        <Heading>
                          {(pair.queryMessage?.llmMessage as any).content}
                        </Heading>
                        <MarkdownProse>
                          {(pair.responseMessage.llmMessage as any).content}
                        </MarkdownProse>
                        {pair.uniqueLinks.length > 0 && (
                          <Stack>
                            <Heading>Resources</Heading>
                            <List.Root variant={"plain"}>
                              {pair.uniqueLinks.map((link) => (
                                <List.Item key={link.scrapeItemId}>
                                  <List.Indicator asChild color="brand.fg">
                                    <TbLink />
                                  </List.Indicator>
                                  <Link
                                    href={`/collections/${pair.scrapeId}/links/${link.scrapeItemId}`}
                                    target="_blank"
                                  >
                                    {link.title}
                                  </Link>
                                </List.Item>
                              ))}
                            </List.Root>
                          </Stack>
                        )}
                      </Stack>
                    </AccordionItemContent>
                  </AccordionItem>
                ))}
              </AccordionRoot>
            )}
          </Stack>
        )}
      </Stack>
    </Page>
  );
}

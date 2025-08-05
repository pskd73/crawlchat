import {
  Group,
  Stack,
  HStack,
  Icon,
  Stat,
  Heading,
  Text,
  DialogHeader,
  Input,
  DialogCloseTrigger,
  Center,
  List,
  ListItem,
  Table,
} from "@chakra-ui/react";
import type { Route } from "./+types/page";
import {
  TbCheck,
  TbDatabase,
  TbHelp,
  TbHome,
  TbMessage,
  TbPlus,
  TbStack,
  TbThumbDown,
  TbThumbUp,
} from "react-icons/tb";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "~/prisma";
import { Page } from "~/components/page";
import {
  XAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  Bar,
  BarChart,
} from "recharts";
import { useEffect, useMemo, useRef, useState } from "react";
import { numberToKMB } from "~/number-util";
import { commitSession } from "~/session";
import { getSession } from "~/session";
import { Link, redirect, useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import {
  DialogBackdrop,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/dialog";
import { Field } from "~/components/ui/field";
import { EmptyState } from "~/components/ui/empty-state";
import { Tooltip as ChakraTooltip } from "~/components/ui/tooltip";
import { getLimits } from "libs/user-plan";
import { toaster } from "~/components/ui/toaster";
import type { KnowledgeGroup, ScrapeItem } from "libs/prisma";
import moment from "moment";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const session = await getSession(request.headers.get("cookie"));
  const scrapeId = session.get("scrapeId");

  // Check scrapeId in session
  const scrapes = await prisma.scrapeUser
    .findMany({
      where: {
        userId: user!.id,
      },
      include: {
        scrape: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    .then((scrapeUsers) => scrapeUsers.map((su) => su.scrape));

  if (scrapeId && !scrapes.find((s) => s.id === scrapeId)) {
    if (scrapes.length > 0) {
      session.set("scrapeId", scrapes[0].id);
    } else {
      session.unset("scrapeId");
    }
    throw redirect("/app", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }
  if (!scrapeId && scrapes.length > 0) {
    session.set("scrapeId", scrapes[0].id);
    throw redirect("/app", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  const ONE_WEEK = 1000 * 60 * 60 * 24 * 7;

  const messages = await prisma.message.findMany({
    where: {
      scrapeId,
      createdAt: {
        gte: new Date(Date.now() - ONE_WEEK),
      },
    },
  });

  const dailyMessages: Record<string, number> = {};

  for (const message of messages) {
    if (!message.createdAt) continue;
    const date = new Date(message.createdAt);
    const key = date.toISOString().split("T")[0];
    dailyMessages[key] = (dailyMessages[key] ?? 0) + 1;
  }

  const today = new Date();
  const todayKey = today.toISOString().split("T")[0];
  const messagesToday = dailyMessages[todayKey] ?? 0;

  const scoreDestribution: Record<number, { count: number }> = {};
  const points = 10;
  for (let i = 0; i < points; i++) {
    scoreDestribution[i] = { count: 0 };
  }

  for (const message of messages) {
    if (!message.links || message.links.length === 0) continue;

    const max = Math.max(...message.links.map((l) => l.score ?? 0));
    const index = Math.floor(max * points);
    scoreDestribution[index] = {
      count: (scoreDestribution[index]?.count ?? 0) + 1,
    };
  }

  const ratingUpCount = messages.filter((m) => m.rating === "up").length;
  const ratingDownCount = messages.filter((m) => m.rating === "down").length;

  const itemCounts: Record<string, number> = {};
  for (const message of messages) {
    if (!message.links || message.links.length === 0) continue;
    for (const link of message.links) {
      if (!link.scrapeItemId) continue;
      itemCounts[link.scrapeItemId] = (itemCounts[link.scrapeItemId] ?? 0) + 1;
    }
  }

  const topItemIds = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topItems: {
    item: ScrapeItem;
    count: number;
    knowledgeGroup: KnowledgeGroup;
  }[] = [];
  for (const [itemId, count] of topItemIds) {
    const item = await prisma.scrapeItem.findUnique({
      where: { id: itemId },
      include: {
        knowledgeGroup: true,
      },
    });
    if (item) {
      topItems.push({ item, count, knowledgeGroup: item.knowledgeGroup! });
    }
  }

  const latestQuestions = messages
    .filter((m) => (m.llmMessage as any)?.role === "user")
    .sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
    )
    .slice(0, 5);

  return {
    user,
    dailyMessages,
    messagesToday,
    scrapeId,
    scoreDestribution,
    scrape: scrapes.find((s) => s.id === scrapeId),
    ratingUpCount,
    ratingDownCount,
    noScrapes: scrapes.length === 0,
    topItems,
    latestQuestions,
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

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request, { redirectTo: "/login" });

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "set-scrape-id") {
    const scrapeId = formData.get("scrapeId");
    const session = await getSession(request.headers.get("cookie"));
    session.set("scrapeId", scrapeId as string);

    throw redirect("/app", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  if (intent === "create-collection") {
    const limits = await getLimits(user!);
    const existingScrapes = await prisma.scrape.count({
      where: {
        userId: user!.id,
      },
    });

    if (existingScrapes >= limits.scrapes) {
      return Response.json(
        {
          error: "You have reached the maximum number of collections",
        },
        { status: 400 }
      );
    }

    const name = formData.get("name");
    const scrape = await prisma.scrape.create({
      data: {
        title: name as string,
        userId: user!.id,
        status: "done",
        indexer: "mars",
      },
    });

    await prisma.scrapeUser.create({
      data: {
        scrapeId: scrape.id,
        userId: user!.id,
        role: "owner",
        email: user!.email,
      },
    });

    const session = await getSession(request.headers.get("cookie"));
    session.set("scrapeId", scrape.id);

    throw redirect("/app?created=true", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }
}

export function StatCard({
  label,
  value,
  icon,
  href,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href?: string;
  color?: string;
}) {
  function render() {
    return (
      <Stat.Root
        flex={1}
        borderWidth="1px"
        p="4"
        rounded="md"
        _hover={{ bg: href ? "brand.gray.50" : undefined }}
        transition={"background-color 0.2s ease-in-out"}
      >
        <HStack justify="space-between" align={"start"}>
          <Stat.Label>{label}</Stat.Label>
          <Icon color={color ?? "fg.muted"} size={"xl"}>
            {icon}
          </Icon>
        </HStack>
        <Stat.ValueText fontSize={"3xl"}>{numberToKMB(value)}</Stat.ValueText>
      </Stat.Root>
    );
  }

  if (href) {
    return (
      <Link to={href} style={{ flex: 1 }}>
        {render()}
      </Link>
    );
  }

  return render();
}

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const newCollectionFetcher = useFetcher();
  const [newCollectionDialogOpen, setNewCollectionDialogOpen] = useState(false);

  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    const DAY_MS = 1000 * 60 * 60 * 24;

    for (let i = 0; i < 7; i++) {
      const date = new Date(today.getTime() - i * DAY_MS);
      const key = date.toISOString().split("T")[0];
      data.push({
        name: key,
        Messages: loaderData.dailyMessages[key] ?? 0,
      });
    }
    return data.reverse();
  }, [loaderData.dailyMessages]);

  const scoreDistributionData = useMemo(() => {
    const data = [];
    const points = Object.keys(loaderData.scoreDestribution).length;
    for (let i = 0; i < points; i++) {
      data.push({
        name: i,
        Messages: loaderData.scoreDestribution[i]?.count ?? 0,
        score: i / points,
      });
    }
    return data;
  }, [loaderData.scoreDestribution]);

  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.clientWidth - 10);
    }
  }, [containerRef, loaderData]);

  useEffect(() => {
    if (loaderData.noScrapes) {
      setNewCollectionDialogOpen(true);
    }
  }, [loaderData.noScrapes]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("created")) {
      setNewCollectionDialogOpen(false);
    }
  }, [newCollectionFetcher.state]);

  useEffect(() => {
    if (newCollectionFetcher.data?.error) {
      toaster.error({
        title: "Error",
        description: newCollectionFetcher.data.error,
      });
    }
  }, [newCollectionFetcher.data]);

  return (
    <Page
      title="Home"
      icon={<TbHome />}
      right={
        <Group>
          <Button
            variant={"subtle"}
            onClick={() => setNewCollectionDialogOpen(true)}
          >
            <TbPlus />
            New collection
          </Button>
          {loaderData.scrape && (
            <Button variant={"subtle"} colorPalette={"brand"} asChild>
              <a
                href={`/w/${loaderData.scrape.slug ?? loaderData.scrapeId}`}
                target="_blank"
              >
                <TbMessage />
                Chat
              </a>
            </Button>
          )}
        </Group>
      }
    >
      {loaderData.noScrapes && (
        <Center w="full" h="full">
          <EmptyState
            icon={<TbDatabase />}
            title="No collections"
            description="Create a new collection to get started"
          >
            <Button
              colorPalette={"brand"}
              onClick={() => setNewCollectionDialogOpen(true)}
            >
              <TbPlus />
              New collection
            </Button>
          </EmptyState>
        </Center>
      )}

      {!loaderData.noScrapes && (
        <Stack height={"100%"} gap={8} ref={containerRef}>
          <Group>
            <StatCard
              label="Messages today"
              value={loaderData.messagesToday}
              icon={<TbMessage />}
            />
            <StatCard
              label="Messages this week"
              value={Object.values(loaderData.dailyMessages).reduce(
                (acc, curr) => acc + curr,
                0
              )}
              icon={<TbMessage />}
            />
            <StatCard
              label="Helpful"
              value={loaderData.ratingUpCount}
              icon={<TbThumbUp />}
              href={`/messages?rating=up`}
              color="green.500"
            />
            <StatCard
              label="Not helpful"
              value={loaderData.ratingDownCount}
              icon={<TbThumbDown />}
              href={`/messages?rating=down`}
              color="red.600"
            />
          </Group>

          <Group gap={8}>
            <Stack>
              <Heading>
                <Group>
                  <TbMessage />
                  <Text>Messages</Text>
                  <ChakraTooltip
                    showArrow
                    content={
                      "Shows the number of messages in conversations in the last 7 days across all the channels"
                    }
                  >
                    <Icon opacity={0.5}>
                      <TbHelp />
                    </Icon>
                  </ChakraTooltip>
                </Group>
              </Heading>
              <AreaChart width={width / 2 - 10} height={200} data={chartData}>
                <XAxis dataKey="name" />
                <Tooltip />
                <CartesianGrid strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="Messages"
                  stroke={"var(--chakra-colors-brand-emphasized)"}
                  fill={"var(--chakra-colors-brand-muted)"}
                />
              </AreaChart>
            </Stack>

            <Stack>
              <Heading>
                <Group>
                  <TbMessage />
                  <Text>Score distribution</Text>
                  <ChakraTooltip
                    showArrow
                    content={
                      "Shows how the score of each message from AI is distributed from 0 to 1. 0 is worst and 1 is best."
                    }
                  >
                    <Icon opacity={0.5}>
                      <TbHelp />
                    </Icon>
                  </ChakraTooltip>
                </Group>
              </Heading>
              <BarChart
                width={width / 2 - 14}
                height={200}
                data={scoreDistributionData}
              >
                <XAxis dataKey="score" />
                <Tooltip />
                <CartesianGrid strokeDasharray="3 3" />
                <Bar
                  type="monotone"
                  dataKey="Messages"
                  fill={"var(--chakra-colors-brand-emphasized)"}
                />
              </BarChart>
            </Stack>
          </Group>

          <Group gap={8}>
            <Stack flex={1}>
              <Heading>
                <Group>
                  <TbDatabase />
                  <Text>Top cited pages</Text>
                </Group>
              </Heading>
              <Table.Root size="sm" flex={1}>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Page</Table.ColumnHeader>
                    <Table.ColumnHeader>Count</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">
                      Group
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {loaderData.topItems.map((item) => (
                    <Table.Row key={item.item.id}>
                      <Table.Cell>{item.item.url}</Table.Cell>
                      <Table.Cell>{item.count}</Table.Cell>
                      <Table.Cell textAlign="end">
                        {item.knowledgeGroup.title}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Stack>

            <Stack flex={1}>
              <Heading>
                <Group>
                  <TbMessage />
                  <Text>Latest questions</Text>
                </Group>
              </Heading>
              <Table.Root size="sm" flex={1}>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Question</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">
                      Created at
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {loaderData.latestQuestions.map((question) => (
                    <Table.Row key={question.id}>
                      <Table.Cell>
                        {(question.llmMessage as any).content}
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        {moment(question.createdAt).fromNow()}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Stack>
          </Group>
        </Stack>
      )}

      <DialogRoot
        open={newCollectionDialogOpen}
        onOpenChange={(e) => setNewCollectionDialogOpen(e.open)}
      >
        <DialogBackdrop />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Group>
                <TbPlus />
                <Text>New collection</Text>
              </Group>
            </DialogTitle>
          </DialogHeader>
          <newCollectionFetcher.Form method="post">
            <DialogBody>
              <input type="hidden" name="intent" value="create-collection" />
              <Field label="Give it a name">
                <Input name="name" placeholder="Collection name" required />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Group>
                <DialogCloseTrigger
                  asChild
                  disabled={newCollectionFetcher.state !== "idle"}
                >
                  <Button variant={"outline"}>Cancel</Button>
                </DialogCloseTrigger>
                <Button
                  type="submit"
                  colorPalette={"brand"}
                  loading={newCollectionFetcher.state !== "idle"}
                >
                  Create
                  <TbCheck />
                </Button>
              </Group>
            </DialogFooter>
          </newCollectionFetcher.Form>
        </DialogContent>
      </DialogRoot>
    </Page>
  );
}

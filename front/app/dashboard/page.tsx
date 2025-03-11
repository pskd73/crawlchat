import {
  Group,
  Stack,
  HStack,
  Icon,
  Stat,
  Heading,
  Text,
} from "@chakra-ui/react";
import type { Route } from "./+types/page";
import { TbHelp, TbHome, TbMessage } from "react-icons/tb";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "~/prisma";
import { Page } from "~/components/page";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { numberToKMB } from "~/number-util";

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

  const ONE_WEEK = 1000 * 60 * 60 * 24 * 7;

  const threads = await prisma.thread.findMany({
    where: {
      scrapeId: {
        in: scrapes.map((scrape) => scrape.id),
      },
      createdAt: {
        gte: new Date(Date.now() - ONE_WEEK),
      },
    },
    select: {
      messages: {
        select: {
          uuid: true,
          createdAt: true,
        },
      },
      createdAt: true,
    },
  });
  const dailyThreads: Record<string, number> = {};
  for (const thread of threads) {
    const date = new Date(thread.createdAt);
    const key = date.toISOString().split("T")[0];
    dailyThreads[key] = (dailyThreads[key] ?? 0) + thread.messages.length;
  }
  const dailyMessages: Record<string, number> = {};
  for (const thread of threads) {
    for (const message of thread.messages) {
      if (!message.createdAt) continue;
      const date = new Date(message.createdAt);
      const key = date.toISOString().split("T")[0];
      dailyMessages[key] = (dailyMessages[key] ?? 0) + 1;
    }
  }

  const today = new Date();
  const todayKey = today.toISOString().split("T")[0];
  const threadsToday = dailyThreads[todayKey] ?? 0;
  const messagesToday = dailyMessages[todayKey] ?? 0;

  return {
    user,
    scrapes,
    itemsCount,
    dailyThreads,
    dailyMessages,
    threadsToday,
    messagesToday,
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

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Stat.Root flex={1} borderWidth="1px" p="4" rounded="md">
      <HStack justify="space-between">
        <Stat.Label>{label}</Stat.Label>
        <Icon color="fg.muted">{icon}</Icon>
      </HStack>
      <Stat.ValueText>{numberToKMB(value)}</Stat.ValueText>
    </Stat.Root>
  );
}

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    const DAY_MS = 1000 * 60 * 60 * 24;

    for (let i = 0; i < 7; i++) {
      const date = new Date(today.getTime() - i * DAY_MS);
      const key = date.toISOString().split("T")[0];
      data.push({
        name: key,
        Conversations: loaderData.dailyThreads[key] ?? 0,
        Messages: loaderData.dailyMessages[key] ?? 0,
      });
    }
    return data.reverse();
  }, [loaderData.dailyThreads, loaderData.dailyMessages]);

  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.clientWidth);
    }
  }, [containerRef]);

  return (
    <Page title="Home" icon={<TbHome />}>
      <Stack height={"100%"} gap={8} ref={containerRef}>
        <Group>
          <StatCard
            label="Chats today"
            value={loaderData.threadsToday}
            icon={<TbHelp />}
          />
          <StatCard
            label="Messages today"
            value={loaderData.messagesToday}
            icon={<TbMessage />}
          />
          <StatCard
            label="Chats this week"
            value={Object.values(loaderData.dailyThreads).reduce(
              (acc, curr) => acc + curr,
              0
            )}
            icon={<TbHelp />}
          />
          <StatCard
            label="Messages this week"
            value={Object.values(loaderData.dailyMessages).reduce(
              (acc, curr) => acc + curr,
              0
            )}
            icon={<TbMessage />}
          />
        </Group>

        <Stack>
          <Heading>
            <Group>
              <TbHelp />
              <Text>Chats</Text>
            </Group>
          </Heading>
          <AreaChart width={width - 10} height={200} data={chartData}>
            <XAxis dataKey="name" />
            <Tooltip />
            <CartesianGrid strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="Conversations"
              stroke={"var(--chakra-colors-brand-emphasized)"}
              fill={"var(--chakra-colors-brand-muted)"}
            />
          </AreaChart>
        </Stack>

        <Stack>
          <Heading>
            <Group>
              <TbMessage />
              <Text>Messages</Text>
            </Group>
          </Heading>
          <AreaChart width={width - 10} height={200} data={chartData}>
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
      </Stack>
    </Page>
  );
}

import { Badge, Group, Stack, Text } from "@chakra-ui/react";
import { TbAlertTriangle, TbFileX } from "react-icons/tb";
import { getAuthUser } from "~/auth/middleware";
import { Page } from "~/components/page";
import { prisma } from "~/prisma";
import type { Message } from "@prisma/client";
import { useMemo } from "react";
import moment from "moment";
import { StatCard } from "~/dashboard/page";
import {
  AccordionItem,
  AccordionItemContent,
  AccordionItemTrigger,
  AccordionRoot,
} from "~/components/ui/accordion";
import type { Route } from "./+types/data-gaps";

type MessagePair = {
  queryMessage?: Message;
  responseMessage: Message;
  maxScore: number;
  minScore: number;
  uniqueLinks: string[];
};

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapes = await prisma.scrape.findMany({
    where: {
      userId: user!.id,
    },
  });

  const ONE_WEEK_AGO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

  const threads = await prisma.thread.findMany({
    where: {
      scrapeId: {
        in: scrapes.map((s) => s.id),
      },
      createdAt: {
        gte: ONE_WEEK_AGO,
      },
    },
  });

  let poorMessages: MessagePair[] = [];

  for (const thread of threads) {
    function findUserMessage(i: number) {
      for (let j = i; j >= 0; j--) {
        if ((thread.messages[j].llmMessage as any).role === "user") {
          return thread.messages[j];
        }
      }
    }

    for (let i = 0; i < thread.messages.length; i++) {
      const message = thread.messages[i];
      const { links } = message;
      if (links.length === 0) {
        continue;
      }
      const maxScore = Math.max(
        ...links.filter((l) => l.score !== null).map((l) => l.score!)
      );
      const minScore = Math.min(
        ...links.filter((l) => l.score !== null).map((l) => l.score!)
      );
      if (maxScore < 0.3) {
        poorMessages.push({
          queryMessage: findUserMessage(i),
          responseMessage: message,
          maxScore,
          minScore,
          uniqueLinks: links
            .filter((l) => l.score !== null)
            .map((l) => l.url)
            .filter((u, i, a) => i === a.findIndex((u2) => u2 === u)),
        });
      }
    }
  }

  poorMessages = poorMessages.sort(
    (a, b) =>
      (b.responseMessage.createdAt?.getTime() ?? 0) -
      (a.responseMessage.createdAt?.getTime() ?? 0)
  );

  return { poorMessages };
}

export default function AnalysePage({ loaderData }: Route.ComponentProps) {
  const poorMessagesToday = useMemo(
    () =>
      loaderData.poorMessages.filter((m) =>
        moment(m.responseMessage.createdAt).isAfter(moment().subtract(1, "day"))
      ),
    [loaderData.poorMessages]
  );

  return (
    <Page title="Data gaps" icon={<TbFileX />}>
      <Stack>
        <Text mb={4} opacity={0.5}>
          These are the questions to which the AI did provide poor responses. It
          can be either the data is not clear in the documents or the data is
          missing completely.
        </Text>
        <Group>
          <StatCard
            label="Poor responses Today"
            value={poorMessagesToday.length}
            icon={<TbAlertTriangle />}
          />
          <StatCard
            label="Poor responses this Week"
            value={loaderData.poorMessages.length}
            icon={<TbAlertTriangle />}
          />
        </Group>

        <Stack>
          <AccordionRoot collapsible defaultValue={["b"]} variant={"enclosed"}>
            {loaderData.poorMessages.map((m, i) => (
              <AccordionItem key={i} value={i.toString()}>
                <AccordionItemTrigger>
                  <Group>
                    <Text>{(m.queryMessage?.llmMessage as any)?.content}</Text>
                    <Badge colorPalette={"red"} variant={"surface"}>
                      {m.minScore.toFixed(2)} - {m.maxScore.toFixed(2)}
                    </Badge>
                    <Text opacity={0.2}>
                      {moment(m.responseMessage.createdAt).fromNow()}
                    </Text>
                  </Group>
                </AccordionItemTrigger>
                <AccordionItemContent>
                  {m.uniqueLinks.map((l) => (
                    <Text key={l}>{l}</Text>
                  ))}
                </AccordionItemContent>
              </AccordionItem>
            ))}
          </AccordionRoot>
        </Stack>
      </Stack>
    </Page>
  );
}

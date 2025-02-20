import { prisma } from "~/prisma";
import type { Route } from "./+types/scrape";
import { Group, Link, Stack, Text } from "@chakra-ui/react";
import { createToken } from "~/jwt";
import "highlight.js/styles/vs.css";
import ChatBox from "~/dashboard/chat-box";
import { commitSession, getSession } from "~/session";
import { data, redirect } from "react-router";

export async function loader({ params, request }: Route.LoaderArgs) {
  const scrape = await prisma.scrape.findUnique({
    where: { id: params.id },
  });

  if (!scrape) {
    return redirect("/");
  }

  const session = await getSession(request.headers.get("cookie"));
  let chatSessionKey = session.get("chatSessionKey");

  if (!chatSessionKey) {
    const thread = await prisma.thread.create({
      data: {
        scrapeId: scrape.id,
      },
    });
    chatSessionKey = thread.id;
  }

  session.set("chatSessionKey", chatSessionKey);

  const userToken = await createToken(chatSessionKey);

  const thread = await prisma.thread.update({
    where: { id: chatSessionKey },
    data: {
      openedAt: new Date(),
    },
  });
  return data(
    { scrape, userToken, thread },
    {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    }
  );
}

export function meta({ data }: Route.MetaArgs) {
  return [
    {
      title: data.scrape.title ?? data.scrape.url,
    },
  ];
}

export default function ScrapeWidget({ loaderData }: Route.ComponentProps) {
  return (
    <Stack h="100dvh" bg="brand.gray.100" p={4}>
      <ChatBox
        thread={loaderData.thread}
        scrape={loaderData.scrape!}
        userToken={loaderData.userToken}
        key={loaderData.thread.id}
      />
      <Group
        justifyContent={"center"}
        opacity={0.4}
        _hover={{ opacity: 1 }}
        transition={"opacity 100ms ease"}
      >
        <Text>
          Made by{" "}
          <Link href="https://crawlchat.com" variant={"underline"}>
            CrawlChat
          </Link>
          !
        </Text>
      </Group>
    </Stack>
  );
}

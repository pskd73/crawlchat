import { prisma } from "~/prisma";
import type { Route } from "./+types/scrape";
import { Stack } from "@chakra-ui/react";
import { createToken } from "~/jwt";
import "highlight.js/styles/vs.css";
import ChatBox from "~/dashboard/chat-box";
import { commitSession, getSession } from "~/session";
import { data, redirect, useFetcher } from "react-router";
import { useEffect } from "react";

export async function loader({ params, request }: Route.LoaderArgs) {
  const scrape = await prisma.scrape.findUnique({
    where: { id: params.id },
  });

  if (!scrape) {
    return redirect("/w/not-found");
  }

  const session = await getSession(request.headers.get("cookie"));
  const chatSessionKeys = session.get("chatSessionKeys") ?? {};

  if (!chatSessionKeys[scrape.id]) {
    const thread = await prisma.thread.create({
      data: {
        scrapeId: scrape.id,
      },
    });
    chatSessionKeys[scrape.id] = thread.id;
  }

  session.set("chatSessionKeys", chatSessionKeys);

  const userToken = createToken(chatSessionKeys[scrape.id], {
    expiresInSeconds: 60 * 60,
  });

  const thread = await prisma.thread.upsert({
    where: { id: chatSessionKeys[scrape.id] },
    update: {
      openedAt: new Date(),
    },
    create: {
      id: chatSessionKeys[scrape.id],
      scrapeId: scrape.id,
      openedAt: new Date(),
    },
  });

  const messages = await prisma.message.findMany({
    where: { threadId: thread.id },
  });

  return data(
    {
      scrape,
      userToken,
      thread,
      messages,
      embed: new URL(request.url).searchParams.get("embed") === "true",
    },
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

export async function action({ request, params }: Route.ActionArgs) {
  const scrapeId = params.id;
  const formData = await request.formData();
  const intent = formData.get("intent");

  const session = await getSession(request.headers.get("cookie"));
  const chatSessionKeys = session.get("chatSessionKeys") ?? {};

  const threadId = chatSessionKeys[scrapeId];

  if (!threadId) {
    throw redirect("/");
  }

  if (intent === "pin") {
    const id = formData.get("id") as string;

    await prisma.message.update({
      where: { id },
      data: {
        pinnedAt: new Date(),
      },
    });
  }

  if (intent === "unpin") {
    const id = formData.get("id") as string;

    await prisma.message.update({
      where: { id },
      data: {
        pinnedAt: null,
      },
    });
  }

  if (intent === "erase") {
    const thread = await prisma.thread.create({
      data: {
        scrapeId: scrapeId,
      },
    });
    chatSessionKeys[scrapeId] = thread.id;
    session.set("chatSessionKeys", chatSessionKeys);
    const userToken = createToken(chatSessionKeys[scrapeId], {
      expiresInSeconds: 60 * 60,
    });
    return data(
      { userToken, thread },
      {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      }
    );
  }

  if (intent === "delete") {
    const ids = (formData.get("ids") as string).split(",");

    await prisma.message.deleteMany({
      where: { id: { in: ids } },
    });
  }
}

export default function ScrapeWidget({ loaderData }: Route.ComponentProps) {
  const pinFetcher = useFetcher();
  const unpinFetcher = useFetcher();
  const eraseFetcher = useFetcher();
  const deleteFetcher = useFetcher();

  useEffect(() => {
    if (loaderData.embed) {
      document.documentElement.style.background = "transparent";
    }
  }, [loaderData.embed]);

  function handleClose() {
    if (loaderData.embed) {
      window.parent.postMessage("close", "*");
    }
  }

  function handlePin(id: string) {
    pinFetcher.submit({ intent: "pin", id }, { method: "post" });
  }

  function handleUnpin(id: string) {
    unpinFetcher.submit({ intent: "unpin", id }, { method: "post" });
  }

  function handleErase() {
    eraseFetcher.submit({ intent: "erase" }, { method: "post" });
  }

  function handleDelete(ids: string[]) {
    deleteFetcher.submit({ intent: "delete", ids }, { method: "post" });
  }

  return (
    <Stack
      h="100dvh"
      bg={loaderData.embed ? "blackAlpha.700" : "brand.gray.100"}
    >
      <ChatBox
        thread={loaderData.thread}
        scrape={loaderData.scrape!}
        userToken={loaderData.userToken}
        key={loaderData.thread.id}
        onBgClick={handleClose}
        onPin={handlePin}
        onUnpin={handleUnpin}
        onErase={handleErase}
        onDelete={handleDelete}
        messages={loaderData.messages}
        embed={loaderData.embed}
      />
    </Stack>
  );
}

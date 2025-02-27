import { prisma } from "~/prisma";
import type { Route } from "./+types/scrape";
import { Group, Link, Stack, Text } from "@chakra-ui/react";
import { createToken } from "~/jwt";
import "highlight.js/styles/vs.css";
import ChatBox from "~/dashboard/chat-box";
import { commitSession, getSession } from "~/session";
import { data, redirect, useFetcher } from "react-router";
import { useEffect, useState } from "react";
import type { Thread } from "@prisma/client";

export async function loader({ params, request }: Route.LoaderArgs) {
  const scrape = await prisma.scrape.findUnique({
    where: { id: params.id },
  });

  if (!scrape) {
    return redirect("/");
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

  const userToken = await createToken(chatSessionKeys[scrape.id]);

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
  return data(
    {
      scrape,
      userToken,
      thread,
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
  const formData = await request.formData();
  const intent = formData.get("intent");

  const session = await getSession(request.headers.get("cookie"));
  const chatSessionKeys = session.get("chatSessionKeys") ?? {};
  const threadId = chatSessionKeys[params.id];

  if (!threadId) {
    throw redirect("/");
  }

  if (intent === "pin") {
    const uuid = formData.get("uuid") as string;
    console.log({ uuid });

    await prisma.thread.update({
      where: { id: threadId },
      data: {
        messages: {
          updateMany: {
            where: { uuid },
            data: { pinnedAt: new Date() },
          },
        },
      },
    });
  }

  if (intent === "unpin") {
    const uuid = formData.get("uuid") as string;

    await prisma.thread.update({
      where: { id: threadId },
      data: {
        messages: {
          updateMany: {
            where: { uuid },
            data: { pinnedAt: null },
          },
        },
      },
    });
  }

  if (intent === "erase") {
    await prisma.thread.update({
      where: { id: threadId },
      data: {
        messages: [],
      },
    });
  }

  if (intent === "delete") {
    const uuids = (formData.get("uuids") as string).split(",");

    await prisma.thread.update({
      where: { id: threadId },
      data: {
        messages: {
          deleteMany: {
            where: { uuid: { in: uuids } },
          },
        },
      },
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

  function handlePin(uuid: string) {
    pinFetcher.submit({ intent: "pin", uuid }, { method: "post" });
  }

  function handleUnpin(uuid: string) {
    unpinFetcher.submit({ intent: "unpin", uuid }, { method: "post" });
  }

  function handleErase() {
    eraseFetcher.submit({ intent: "erase" }, { method: "post" });
  }

  function handleDelete(uuids: string[]) {
    deleteFetcher.submit({ intent: "delete", uuids }, { method: "post" });
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
      />
    </Stack>
  );
}

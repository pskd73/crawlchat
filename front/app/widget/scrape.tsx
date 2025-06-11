import { prisma } from "~/prisma";
import type { Route } from "./+types/scrape";
import { Stack } from "@chakra-ui/react";
import { createToken } from "~/jwt";
import "highlight.js/styles/vs.css";
import ChatBox from "~/dashboard/chat-box";
import { commitSession, getSession } from "~/session";
import { data, redirect, useFetcher } from "react-router";
import { useEffect } from "react";
import type { MessageRating } from "libs/prisma";
import { randomUUID } from "crypto";
import { getNextNumber } from "libs/mongo-counter";
import { sendReactEmail } from "~/email";
import TicketUserCreateEmail from "emails/ticket-user-create";
import { Toaster, toaster } from "~/components/ui/toaster";

function isMongoObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const scrape = await prisma.scrape.findFirst({
    where: isMongoObjectId(params.id) ? { id: params.id } : { slug: params.id },
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
  const scrape = await prisma.scrape.findFirst({
    where: isMongoObjectId(params.id) ? { id: params.id } : { slug: params.id },
  });

  if (!scrape) {
    return redirect("/w/not-found");
  }

  const scrapeId = scrape.id;
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

  if (intent === "rate") {
    const id = formData.get("id") as string;
    const rating = formData.get("rating") as MessageRating;

    await prisma.message.update({
      where: { id },
      data: {
        rating,
      },
    });
  }

  if (intent === "ticket-create") {
    const email = formData.get("email") as string;
    const title = formData.get("title") as string;
    const message = formData.get("message") as string;

    const scrape = await prisma.scrape.findFirstOrThrow({
      where: { id: scrapeId },
    });

    await prisma.message.create({
      data: {
        threadId,
        scrapeId,
        ownerUserId: scrape.userId,
        llmMessage: {
          role: "user",
          content: message,
        },
        ticketMessage: {
          role: "user",
          event: "message",
        },
      },
    });

    const ticketKey = randomUUID().slice(0, 8);
    const ticketNumber = await getNextNumber("ticket-number");

    await prisma.thread.update({
      where: { id: threadId },
      data: {
        title,
        ticketKey,
        ticketNumber,
        ticketStatus: "open",
        ticketUserEmail: email,
      },
    });

    await sendReactEmail(
      email,
      `Ticket created (#${ticketNumber})`,
      <TicketUserCreateEmail
        scrapeTitle={scrape.title ?? "CrawlChat"}
        ticketNumber={ticketNumber}
        ticketKey={ticketKey}
        title={title}
      />
    );

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
}

export default function ScrapeWidget({ loaderData }: Route.ComponentProps) {
  const pinFetcher = useFetcher();
  const unpinFetcher = useFetcher();
  const eraseFetcher = useFetcher();
  const deleteFetcher = useFetcher();
  const rateFetcher = useFetcher();
  const ticketCreateFetcher = useFetcher();

  useEffect(() => {
    if (loaderData.embed) {
      document.documentElement.style.background = "transparent";
    }

    function handleKeyDown(event: KeyboardEvent) {
      window.parent.postMessage(
        JSON.stringify({
          type: "keydown",
          data: {
            key: event.key,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
          },
        }),
        "*"
      );
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loaderData.embed]);

  useEffect(() => {
    if (ticketCreateFetcher.data) {
      toaster.create({
        title: "Ticket created",
        description: "You will be notified on email on updates!",
      });
    }
  }, [ticketCreateFetcher.data]);

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

  function handleRate(id: string, rating: MessageRating) {
    toaster.create({
      title: "Rating submitted",
      description: "Thank you for your feedback!",
    });
    rateFetcher.submit({ intent: "rate", id, rating }, { method: "post" });
  }

  function handleTicketCreate(email: string, title: string, message: string) {
    ticketCreateFetcher.submit(
      { intent: "ticket-create", email, title, message },
      { method: "post" }
    );
  }

  return (
    <Stack
      h="100dvh"
      bg={loaderData.embed ? "blackAlpha.700" : "brand.gray.100"}
    >
      <Toaster />
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
        onRate={handleRate}
        onTicketCreate={handleTicketCreate}
        ticketCreationLoading={ticketCreateFetcher.state !== "idle"}
        ticketingEnabled={loaderData.scrape.ticketingEnabled ?? false}
        resolveQuestion={loaderData.scrape.resolveQuestion ?? undefined}
        resolveDescription={loaderData.scrape.resolveDescription ?? undefined}
        resolveYesConfig={loaderData.scrape.resolveYesConfig ?? undefined}
        resolveNoConfig={loaderData.scrape.resolveNoConfig ?? undefined}
      />
    </Stack>
  );
}

import type { Route } from "./+types/page";
import type { Message, MessageRating, Scrape, Thread } from "libs/prisma";
import { prisma } from "~/prisma";
import { createToken } from "libs/jwt";
import { commitSession, getSession } from "~/session";
import { data, redirect, type Session } from "react-router";
import { getNextNumber } from "libs/mongo-counter";
import { sendReactEmail } from "~/email";
import { fetchIpDetails, getClientIp } from "~/client-ip";
import { ChatBoxProvider } from "~/widget/use-chat-box";
import { sanitizeScrape } from "~/scrapes/util";
import { getAuthUser } from "~/auth/middleware";
import { Toaster } from "react-hot-toast";
import { randomUUID } from "crypto";
import cn from "@meltdownjs/cn";
import TicketUserCreateEmail from "emails/ticket-user-create";
import TicketAdminCreateEmail from "emails/ticket-admin-create";
import ChatBox, { ChatboxContainer } from "~/widget/chat-box";

function isMongoObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

function getCustomTags(url: URL): Record<string, any> | null {
  try {
    return JSON.parse(atob(url.searchParams.get("tags") ?? ""));
  } catch (error) {}
  return null;
}

async function updateSessionThreadId(
  session: Session,
  scrapeId: string,
  threadId: string
) {
  const chatSessionKeys = session.get("chatSessionKeys") ?? {};

  if (!chatSessionKeys[scrapeId]) {
    chatSessionKeys[scrapeId] = threadId;
  }

  session.set("chatSessionKeys", chatSessionKeys);
  return session;
}

async function isAllowed(request: Request, scrape: Scrape) {
  const loggedInUser = await getAuthUser(request, {
    dontRedirect: true,
  });

  if (!scrape.widgetConfig?.private) {
    return true;
  }

  if (!loggedInUser) {
    return false;
  }

  if (loggedInUser.scrapeUsers.some((su) => su.scrapeId === scrape.id)) {
    return true;
  }

  return false;
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const scrape = await prisma.scrape.findFirst({
    where: isMongoObjectId(params.id) ? { id: params.id } : { slug: params.id },
  });

  if (!scrape || !(await isAllowed(request, scrape))) {
    return redirect("/w/not-found");
  }

  let messages: Message[] = [];
  let thread: Thread | null = null;
  let userToken: string | null = null;

  const session = await getSession(request.headers.get("cookie"));
  const chatSessionKeys = session.get("chatSessionKeys") ?? {};

  if (chatSessionKeys[scrape.id]) {
    thread = await prisma.thread.findFirst({
      where: { id: chatSessionKeys[scrape.id] },
    });

    if (thread) {
      messages = await prisma.message.findMany({
        where: { threadId: thread.id },
      });

      userToken = createToken(chatSessionKeys[scrape.id], {
        expiresInSeconds: 60 * 60 * 24,
      });
    }
  }

  const searchParams = new URL(request.url).searchParams;
  const embed = searchParams.get("embed") === "true";
  const width = searchParams.get("width");
  const height = searchParams.get("height");
  const fullscreen = searchParams.get("fullscreen") === "true";

  sanitizeScrape(scrape);

  return {
    scrape,
    userToken,
    thread,
    messages,
    embed,
    width,
    height,
    fullscreen,
  };
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

  if (!scrape || !(await isAllowed(request, scrape))) {
    return redirect("/w/not-found");
  }

  const scrapeId = scrape.id;
  const formData = await request.formData();
  const intent = formData.get("intent");

  const session = await getSession(request.headers.get("cookie"));
  const chatSessionKeys = session.get("chatSessionKeys") ?? {};

  const threadId = chatSessionKeys[scrapeId];

  if (intent === "create-thread") {
    const customTags = getCustomTags(new URL(request.url));
    const ip = getClientIp(request);
    const ipDetails = ip ? await fetchIpDetails(ip) : null;
    const thread = await prisma.thread.create({
      data: {
        scrapeId: scrape.id,
        openedAt: new Date(),
        customTags,
        ticketUserEmail: customTags?.email,
        location: {
          country: ipDetails?.country,
          city: ipDetails?.city,
          region: ipDetails?.region,
        },
      },
    });
    await updateSessionThreadId(session, scrapeId, thread.id);
    const userToken = createToken(thread.id, {
      expiresInSeconds: 60 * 60 * 24,
    });
    return data(
      { thread, userToken },
      {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      }
    );
  }

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
    delete chatSessionKeys[scrapeId];
    session.set("chatSessionKeys", chatSessionKeys);
    return data(
      { userToken: null },
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
      include: {
        user: true,
      },
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

    if (scrape.user.settings?.ticketEmailUpdates ?? true) {
      await sendReactEmail(
        scrape.user.email,
        `New ticket (#${ticketNumber})`,
        <TicketAdminCreateEmail
          scrapeTitle={scrape.title ?? "CrawlChat"}
          ticketNumber={ticketNumber}
          title={title}
          message={message}
          email={email}
        />
      );
    }

    const customTags = getCustomTags(new URL(request.url));
    const thread = await prisma.thread.create({
      data: {
        scrapeId: scrapeId,
        ticketUserEmail: customTags?.email,
        customTags,
      },
    });
    await updateSessionThreadId(session, scrapeId, thread.id);
    const userToken = createToken(chatSessionKeys[scrapeId], {
      expiresInSeconds: 60 * 60 * 24,
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
  return (
    <ChatBoxProvider
      scrape={loaderData.scrape}
      thread={loaderData.thread}
      messages={loaderData.messages}
      embed={loaderData.embed}
      admin={false}
      token={loaderData.userToken}
      fullscreen={loaderData.fullscreen}
    >
      <div
        className={cn(
          "h-screen",
          loaderData.embed ? "bg-black/50" : "bg-base-300"
        )}
      >
        <Toaster />
        <ChatboxContainer>
          <ChatBox />
        </ChatboxContainer>
      </div>
    </ChatBoxProvider>
  );
}

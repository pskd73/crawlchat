import type { Route } from "./+types/page";
import type {
  Message,
  MessageRating,
  Scrape,
  ScrapeUser,
  Thread,
  User,
} from "libs/prisma";
import { prisma } from "~/prisma";
import { createToken } from "libs/jwt";
import { commitSession, getSession } from "~/session";
import { data, redirect, type Session } from "react-router";
import { fetchIpDetails, getClientIp } from "~/client-ip";
import { ChatBoxProvider } from "~/widget/use-chat-box";
import { sanitizeScrape, sanitizeThread } from "~/scrapes/util";
import { getAuthUser } from "~/auth/middleware";
import { Toaster } from "react-hot-toast";
import cn from "@meltdownjs/cn";
import ChatBox, { ChatboxContainer } from "~/widget/chat-box";
import { makeMeta } from "~/meta";
import { sendChatVerifyEmail } from "~/email";

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

async function isAllowed(
  scrape: Scrape,
  loggedInUser: null | (User & { scrapeUsers: ScrapeUser[] })
) {
  if (!scrape.private) {
    return true;
  }

  if (loggedInUser?.scrapeUsers.some((su) => su.scrapeId === scrape.id)) {
    return true;
  }

  return false;
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const loggedInUser = await getAuthUser(request, {
    dontRedirect: true,
  });

  const scrape = await prisma.scrape.findFirst({
    where: isMongoObjectId(params.id) ? { id: params.id } : { slug: params.id },
  });

  if (!scrape || !(await isAllowed(scrape, loggedInUser))) {
    return redirect("/w/not-found");
  }

  const url = new URL(request.url);
  const noPrimaryColor = url.searchParams.get("noPrimaryColor") === "true";
  if (noPrimaryColor && scrape.widgetConfig) {
    scrape.widgetConfig.applyColorsToChatbox = false;
  }

  let messages: Message[] = [];
  let thread: Thread | null = null;
  let userToken: string | null = null;
  const headers: HeadersInit = {};

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

      userToken = createToken(loggedInUser?.id ?? chatSessionKeys[scrape.id], {
        expiresInSeconds: 60 * 60 * 24,
      });
    }
  }

  if (thread && messages.length > 60) {
    console.log("Clearing chat session");
    delete chatSessionKeys[thread.scrapeId];
    session.set("chatSessionKeys", chatSessionKeys);
    userToken = null;
    messages = [];
    headers["Set-Cookie"] = await commitSession(session);
  }

  const searchParams = new URL(request.url).searchParams;
  const embed = searchParams.get("embed") === "true";
  const width = searchParams.get("width");
  const height = searchParams.get("height");
  const fullscreen = searchParams.get("fullscreen") === "true";
  const sidePanel = searchParams.get("sidepanel") === "true";

  sanitizeScrape(scrape);
  sanitizeThread(thread);

  return data(
    {
      scrape,
      userToken,
      thread,
      messages,
      embed,
      width,
      height,
      fullscreen,
      sidePanel,
    },
    {
      headers,
    }
  );
}

export function meta({ data }: Route.MetaArgs) {
  return makeMeta({
    title: data.scrape.title ?? data.scrape.url ?? "CrawlChat",
  });
}

export async function action({ request, params }: Route.ActionArgs) {
  const loggedInUser = await getAuthUser(request, {
    dontRedirect: true,
  });

  const scrape = await prisma.scrape.findFirst({
    where: isMongoObjectId(params.id) ? { id: params.id } : { slug: params.id },
  });

  if (!scrape || !(await isAllowed(scrape, loggedInUser))) {
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

    const response = await fetch(
      `${process.env.VITE_SERVER_URL}/ticket/${scrapeId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${createToken(scrape.userId)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: email,
          title,
          message,
          threadId,
        }),
      }
    );

    if (!response.ok) {
      return data(
        { error: "Failed to create ticket" },
        { status: response.status }
      );
    }

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

  if (intent === "request-email-verification") {
    const email = formData.get("email") as string;
    if (!email) {
      return data({ error: "Email is required" }, { status: 400 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await sendChatVerifyEmail(email, otp);

    await prisma.thread.update({
      where: { id: threadId },
      data: {
        emailEntered: email,
        emailOtp: otp,
      },
    });

    return { success: true };
  }

  if (intent === "verify-email") {
    const otp = formData.get("otp") as string;
    const thread = await prisma.thread.findFirst({
      where: { id: threadId },
    });

    if (otp && otp !== thread?.emailOtp) {
      return data({ error: "Invalid OTP" }, { status: 400 });
    }

    await prisma.thread.update({
      where: { id: threadId },
      data: {
        emailVerifiedAt: new Date(),
      },
    });

    return { success: true };
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
      sidePanel={loaderData.sidePanel}
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

import type { Route } from "./+types/page";
import type {
  User,
  KnowledgeGroup,
  Scrape,
  Message,
  Thread,
} from "@packages/common/prisma";
import { getAuthUser } from "~/auth/middleware";
import { Link, redirect, useLoaderData } from "react-router";
import { prisma } from "@packages/common/prisma";
import { MarkdownProse } from "~/widget/markdown-prose";
import { getQueryString } from "@packages/common/llm-message";
import { TbConfetti, TbCopy } from "react-icons/tb";
import { toast, Toaster } from "react-hot-toast";
import { makeMeta } from "~/meta";
import cn from "@meltdownjs/cn";
import Avatar from "boring-avatars";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useRef, useState } from "react";
import moment from "moment";
import { adminEmails } from "./emails";

type UserDetail = {
  user: User;
  scrapes: Scrape[];
  groups: KnowledgeGroup[];
};

type MessageDetail = {
  message: Message;
  user: User;
  scrape: Scrape;
  thread: Thread;
};

function cleanName(name: string) {
  if (name.length < 20) {
    return name;
  }
  return name.slice(0, 20) + "...";
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  if (!adminEmails.includes(user!.email)) {
    throw redirect("/app");
  }

  const lastUsers = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  const userDetails: UserDetail[] = await Promise.all(
    lastUsers.map(async (user) => {
      const scrapes = await prisma.scrape.findMany({
        where: {
          userId: user.id,
        },
      });

      const groups = await prisma.knowledgeGroup.findMany({
        where: {
          userId: user.id,
        },
      });

      return {
        user,
        scrapes,
        groups,
      };
    })
  );

  const lastMessages = await prisma.message.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      thread: true,
    },
    take: 100,
  });

  const messageDetails: MessageDetail[] = await Promise.all(
    lastMessages.map(async (message) => {
      const user = await prisma.user.findFirstOrThrow({
        where: {
          id: message.ownerUserId,
        },
      });

      const scrape = await prisma.scrape.findFirstOrThrow({
        where: {
          id: message.scrapeId,
        },
      })!;

      return {
        message,
        user,
        scrape,
        thread: message.thread,
      };
    })
  );

  async function getMessagesCount(startDate: Date, endDate: Date) {
    const messages = await prisma.message.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        llmMessage: {
          is: {
            role: "user",
          },
        },
      },
      select: {
        scrape: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    const counts: Record<string, number> = {};
    for (const message of messages) {
      counts[message.scrape.id] = (counts[message.scrape.id] ?? 0) + 1;
    }
    const scrapes: Record<string, string> = {};
    for (const message of messages) {
      scrapes[message.scrape.id] = cleanName(
        message.scrape.title ?? message.scrape.id
      );
    }
    const total = Object.values(counts).reduce((acc, count) => acc + count, 0);
    return { counts, scrapes, total };
  }

  const dailyMessages = await Promise.all(
    Array.from({ length: 30 }).map(async (_, index) => {
      const now = moment();
      const dayTime = now.subtract(index, "days");
      const startOfDay = dayTime.clone().startOf("day");
      const endOfDay = dayTime.clone().endOf("day");
      const { counts, scrapes, total } = await getMessagesCount(
        startOfDay.toDate(),
        endOfDay.toDate()
      );
      return {
        name: startOfDay.format("YYYY-MM-DD"),
        counts,
        scrapes,
        total,
      };
    })
  );

  return {
    userDetails,
    messageDetails,
    dailyMessages,
  };
}

export function meta() {
  return makeMeta({
    title: "Admin - CrawlChat",
  });
}

function UsersTable({ userDetails }: { userDetails: UserDetail[] }) {
  return (
    <div className="overflow-x-auto border border-base-300 rounded-box bg-base-100 shadow">
      <table className="table">
        <thead>
          <tr>
            <th>Id</th>
            <th>Email</th>
            <th>Name</th>
            <th>Scrapes</th>
            <th>Groups</th>
            <th>Scrape credits</th>
            <th>Message credits</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {userDetails.map((userDetail) => (
            <tr key={userDetail.user.id}>
              <td>{userDetail.user.id}</td>
              <td>
                <Link
                  to={`/admin-fowl/user/${userDetail.user.id}`}
                  className="link link-primary link-hover"
                >
                  {userDetail.user.email}
                </Link>
              </td>
              <td>{userDetail.user.name}</td>
              <td>{userDetail.scrapes.length}</td>
              <td>{userDetail.groups.length}</td>
              <td>{userDetail.user.plan?.credits?.scrapes}</td>
              <td>{userDetail.user.plan?.credits?.messages}</td>
              <td>{userDetail.user.createdAt.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Score({ message }: { message: Message }) {
  if (message.links.length === 0) return "NA";
  const min = Math.min(...message.links.map((l) => l.score ?? 0)).toFixed(2);
  const max = Math.max(...message.links.map((l) => l.score ?? 0)).toFixed(2);
  const avg = (
    message.links.reduce((acc, l) => acc + (l.score ?? 0), 0) /
    message.links.length
  ).toFixed(2);
  return `[${min}, ${avg}, ${max}]`;
}

function MessagesTable({
  messageDetails,
}: {
  messageDetails: MessageDetail[];
}) {
  function handleCopy(id: string) {
    navigator.clipboard.writeText(id);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="overflow-x-auto border border-base-300 rounded-box bg-base-100 shadow">
      <table className="table">
        <thead>
          <tr>
            <th>Collection</th>
            <th>User</th>
            <th>Id</th>
            <th>Category</th>
            <th>Score</th>
            <th>Channel</th>
            <th>LLM</th>
            <th>Cost</th>
            <th>Data gap</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {messageDetails.map((messageDetail, index) => (
            <tr
              key={messageDetail.message.id}
              data-message-id={messageDetail.message.id}
            >
              <td>
                <Link
                  to={`/admin-fowl/collection/${messageDetail.scrape.id}`}
                  className="link link-primary link-hover"
                >
                  {messageDetail.scrape.title}
                </Link>
              </td>
              <td>
                <div className="flex items-center gap-2">
                  {messageDetail.message.fingerprint && (
                    <Avatar
                      name={messageDetail.message.fingerprint}
                      size={24}
                      variant="beam"
                    />
                  )}
                  <Link
                    to={`/admin-fowl/user/${messageDetail.user.id}`}
                    className="link link-primary link-hover"
                  >
                    {messageDetail.user.email}
                  </Link>
                </div>
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "tooltip",
                      index < 10 && "first:tooltip-bottom"
                    )}
                    data-tip={getQueryString(
                      (messageDetail.message.llmMessage as any).content
                    )}
                  >
                    {messageDetail.message.id.substring(
                      messageDetail.message.id.length - 4
                    )}
                  </div>
                  <button
                    className="btn btn-xs btn-square"
                    onClick={() => handleCopy(messageDetail.message.id)}
                  >
                    <TbCopy />
                  </button>
                </div>
              </td>
              <td>{messageDetail.message.analysis?.category}</td>
              <td>
                <div className="flex items-center gap-2">
                  {messageDetail.message.analysis?.resolved && (
                    <div className="badge badge-primary badge-soft gap-1 px-2">
                      <TbConfetti />
                    </div>
                  )}
                  <Score message={messageDetail.message} />
                </div>
              </td>
              <td>{messageDetail.message.channel ?? "chatbot"}</td>
              <td>
                {`${messageDetail.message.llmModel ?? "-"}, ${
                  messageDetail.message.creditsUsed ?? "-"
                }`}
              </td>
              <td>
                {messageDetail.message.llmCost != null ? (
                  <div
                    className="tooltip"
                    data-tip={`${messageDetail.message.promptTokens ?? 0} input tokens`}
                  >
                    ${messageDetail.message.llmCost.toFixed(4)}
                  </div>
                ) : (
                  "-"
                )}
              </td>
              <td>
                {messageDetail.message.dataGap?.title && (
                  <div className="dropdown dropdown-end">
                    <div tabIndex={0} className="btn mb-1">
                      Yes
                    </div>
                    <div
                      tabIndex={0}
                      className="dropdown-content bg-base-100 rounded-box z-1 w-80 p-4 shadow-sm"
                    >
                      <div className="text-lg font-bold mb-2">
                        {messageDetail.message.dataGap.title}
                      </div>
                      <MarkdownProse>
                        {messageDetail.message.dataGap.description}
                      </MarkdownProse>
                    </div>
                  </div>
                )}
              </td>
              <td>{messageDetail.message.createdAt.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const data = [
  {
    name: "Page A",
    uv: 4000,
    pv: 2400,
    amt: 2400,
  },
  {
    name: "Page B",
    uv: 3000,
    pv: 1398,
    amt: 2210,
  },
  {
    name: "Page C",
    uv: 2000,
    pv: 9800,
    amt: 2290,
  },
  {
    name: "Page D",
    uv: 2780,
    pv: 3908,
    amt: 2000,
  },
  {
    name: "Page E",
    uv: 1890,
    pv: 4800,
    amt: 2181,
  },
  {
    name: "Page F",
    uv: 2390,
    pv: 3800,
    amt: 2500,
  },
  {
    name: "Page G",
    uv: 3490,
    pv: 4300,
    amt: 2100,
  },
];

function MessagesChart() {
  const dailyMessages = useLoaderData<typeof loader>().dailyMessages;
  const containerRef = useRef<HTMLDivElement>(null);
  const [graph, setGraph] = useState<{
    width: number;
    scrapes: { id: string; name: string; color: string }[];
  }>();

  useEffect(() => {
    if (containerRef.current) {
      const scrapes: Record<string, string> = {};

      for (const day of dailyMessages) {
        for (const scrapeId in day.scrapes) {
          scrapes[scrapeId] = day.scrapes[scrapeId];
        }
      }

      setGraph({
        width: containerRef.current.clientWidth - 50,
        scrapes: Object.entries(scrapes).map(([id, name]) => ({
          id,
          name,
          color: getRandomColor(),
        })),
      });
    }
  }, [containerRef]);

  function getRandomColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  }

  return (
    <div ref={containerRef} className="w-full h-[400px]">
      {graph && (
        <BarChart
          width={graph.width}
          height={400}
          data={dailyMessages}
          margin={{
            top: 20,
            right: 0,
            left: 0,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" reversed />
          <YAxis />
          <Tooltip />
          <Legend />
          {graph.scrapes.map((scrape) => (
            <Bar
              dataKey={`counts.${scrape.id}`}
              stackId="a"
              fill={scrape.color}
              name={scrape.name}
            />
          ))}
        </BarChart>
      )}
    </div>
  );
}

export default function Admin({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <MessagesChart />
      <div className="text-2xl font-bold">Users</div>
      <UsersTable userDetails={loaderData.userDetails} />
      <div className="text-2xl font-bold mt-4">Messages</div>
      <MessagesTable messageDetails={loaderData.messageDetails} />
      <Toaster />
    </div>
  );
}

import type {
  KnowledgeGroup,
  Message,
  Scrape,
  Thread,
  User,
} from "@packages/common/prisma";
import { prisma } from "@packages/common/prisma";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { toast, Toaster } from "react-hot-toast";
import { TbApi, TbChartBarOff, TbConfetti, TbFolder } from "react-icons/tb";
import { Link, redirect, useLoaderData } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAuthUser } from "~/auth/middleware";
import { ChannelBadge } from "~/components/channel-badge";
import { ScoreBadge } from "~/components/score-badge";
import { getMessageContent } from "~/message/messages";
import { SearchTypeBadge } from "~/message/search-type-badge";
import { makeMeta } from "~/meta";
import { MarkdownProse } from "~/widget/markdown-prose";
import { BRIGHT_COLORS } from "../summary/bright-colors";
import type { Route } from "./+types/page";
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
              <td>{userDetail.user.createdAt.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
            <th>Id</th>
            <th>Collection</th>
            <th>Content</th>
            <th>Details</th>
            <th className="text-right">Created At</th>
          </tr>
        </thead>
        <tbody>
          {messageDetails.map((messageDetail, index) => (
            <tr
              key={messageDetail.message.id}
              data-message-id={messageDetail.message.id}
            >
              <td>
                <div
                  className="flex items-center gap-2"
                  onClick={() => handleCopy(messageDetail.message.id)}
                >
                  {messageDetail.message.id.substring(
                    messageDetail.message.id.length - 4
                  )}
                </div>
              </td>
              <td>
                <Link
                  to={`/admin-fowl/collection/${messageDetail.scrape.id}`}
                  className="link link-primary link-hover"
                >
                  {messageDetail.scrape.title}
                </Link>
              </td>
              <td
                className="max-w-md truncate"
                title={getMessageContent(messageDetail.message)}
              >
                {getMessageContent(messageDetail.message)}
              </td>
              <td>
                <div className="flex items-center gap-2 flex-wrap">
                  <ChannelBadge
                    channel={messageDetail.message.channel}
                    onlyIcon
                  />
                  {messageDetail.message.llmCost && (
                    <span className="badge badge-soft badge-neutral">
                      C: ${messageDetail.message.llmCost?.toFixed(2)}
                    </span>
                  )}
                  {messageDetail.message.analysis?.cost && (
                    <span className="badge badge-soft badge-neutral">
                      A: ${messageDetail.message.analysis?.cost?.toFixed(2)}
                    </span>
                  )}
                  {messageDetail.message.llmModel && (
                    <span className="badge badge-soft badge-neutral">
                      {messageDetail.message.llmModel.split("/").pop()}
                    </span>
                  )}
                  {messageDetail.message.analysis?.resolved && (
                    <div className="badge badge-primary badge-soft gap-1 px-2">
                      <TbConfetti />
                    </div>
                  )}
                  {messageDetail.message.links.length > 0 && (
                    <ScoreBadge
                      score={Math.max(
                        ...messageDetail.message.links.map((l) => l.score ?? 0)
                      )}
                    />
                  )}
                  {[
                    ...new Set(
                      messageDetail.message.links
                        .map((l) => l.searchType)
                        .filter((t): t is string => t !== null)
                    ),
                  ].map((searchType) => (
                    <SearchTypeBadge
                      key={searchType}
                      searchType={searchType}
                      onlyIcon
                    />
                  ))}
                  {messageDetail.message.analysis?.category && (
                    <span className="badge badge-soft badge-accent whitespace-nowrap">
                      <TbFolder />
                      {messageDetail.message.analysis?.category}
                    </span>
                  )}
                  {messageDetail.message.dataGap?.title && (
                    <div className="dropdown dropdown-end">
                      <span className="badge badge-soft badge-error whitespace-nowrap">
                        <TbChartBarOff />
                      </span>
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
                  {messageDetail.message.showedApiPlayground && (
                    <div className="badge badge-soft badge-secondary">
                      <TbApi />
                    </div>
                  )}
                </div>
              </td>
              <td className="text-right">
                {messageDetail.message.createdAt.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
        scrapes: Object.entries(scrapes).map(([id, name], index) => ({
          id,
          name,
          color: BRIGHT_COLORS[index % BRIGHT_COLORS.length],
        })),
      });
    }
  }, [containerRef]);

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
      <div className="mb-2">
        <Link
          to="/admin-fowl/customers"
          className="link link-primary link-hover"
        >
          Customers
        </Link>
      </div>
      <div className="mb-2">
        <Link
          to="/admin-fowl/add-credit"
          className="link link-primary link-hover"
        >
          Add Credit
        </Link>
      </div>
      <div className="mb-2">
        <Link
          to="/admin-fowl/model-costs"
          className="link link-primary link-hover"
        >
          Model Costs
        </Link>
      </div>
      <div className="text-2xl font-bold">Users</div>
      <UsersTable userDetails={loaderData.userDetails} />
      <div className="text-2xl font-bold mt-4">Messages</div>
      <div className="mb-2">
        <Link
          to="/admin-fowl/unanswered-messages"
          className="link link-primary link-hover"
        >
          Unanswered Messages
        </Link>
      </div>
      <MessagesTable messageDetails={loaderData.messageDetails} />
      <Toaster />
    </div>
  );
}

import type { Route } from "./+types/page";
import type {
  User,
  KnowledgeGroup,
  Scrape,
  Message,
  Thread,
} from "libs/prisma";
import { getAuthUser } from "~/auth/middleware";
import { redirect } from "react-router";
import { prisma } from "libs/prisma";
import { MarkdownProse } from "~/widget/markdown-prose";

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

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  if (user?.email !== "pramodkumar.damam73@gmail.com") {
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

  return {
    userDetails,
    messageDetails,
  };
}

function UsersTable({ userDetails }: { userDetails: UserDetail[] }) {
  return (
    <div className="overflow-x-auto">
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
              <td>{userDetail.user.email}</td>
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
  if (message.links.length === 0) return null;
  const min = Math.min(...message.links.map((l) => l.score ?? 0)).toFixed(2);
  const max = Math.max(...message.links.map((l) => l.score ?? 0)).toFixed(2);
  const avg = (
    message.links.reduce((acc, l) => acc + (l.score ?? 0), 0) /
    message.links.length
  ).toFixed(2);
  return `[${min}, ${avg}, ${max}]`;
}

function WithPopover({
  title,
  popoverContent,
  children,
}: {
  title?: string;
  popoverContent: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="dropdown">
      <div className="btn mb-1">{children}</div>
      <div className="dropdown-content bg-base-100 rounded-box z-1 w-80 p-2 shadow-sm">
        <div className="font-bold">{title}</div>
        {popoverContent}
      </div>
    </div>
  );
}

function MessagesTable({
  messageDetails,
}: {
  messageDetails: MessageDetail[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Message</th>
            <th>Scrape</th>
            <th>User</th>
            <th>Score</th>
            <th>Channel</th>
            <th>Data gap</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {messageDetails.map((messageDetail) => (
            <tr key={messageDetail.message.id}>
              <td>{(messageDetail.message.llmMessage as any).content}</td>
              <td>{messageDetail.scrape.title}</td>
              <td>{messageDetail.user.email}</td>
              <td>
                <Score message={messageDetail.message} />
              </td>
              <td>{messageDetail.message.channel ?? "chatbot"}</td>
              <td>
                {messageDetail.message.analysis?.dataGapTitle && (
                  <WithPopover
                    title={messageDetail.message.analysis.dataGapTitle}
                    popoverContent={
                      <MarkdownProse>
                        {messageDetail.message.analysis.dataGapDescription}
                      </MarkdownProse>
                    }
                  >
                    Yes
                  </WithPopover>
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

export default function Admin({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="text-2xl font-bold">Users</div>
      <UsersTable userDetails={loaderData.userDetails} />
      <div className="text-2xl font-bold mt-4">Messages</div>
      <MessagesTable messageDetails={loaderData.messageDetails} />
    </div>
  );
}

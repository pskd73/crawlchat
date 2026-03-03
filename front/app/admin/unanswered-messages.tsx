import cn from "@meltdownjs/cn";
import { getQueryString } from "@packages/common/llm-message";
import type { Message } from "@packages/common/prisma";
import { prisma } from "@packages/common/prisma";
import { toast, Toaster } from "react-hot-toast";
import { TbCopy } from "react-icons/tb";
import { Link, redirect } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { makeMeta } from "~/meta";
import type { Route } from "./+types/unanswered-messages";
import { adminEmails } from "./emails";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  if (!adminEmails.includes(user!.email)) {
    throw redirect("/app");
  }

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        {
          answerId: null,
        },
        {
          answerId: {
            isSet: false,
          },
        },
      ],
      llmMessage: {
        is: {
          role: "user",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      thread: true,
      ownerUser: true,
      scrape: true,
    },
    take: 50,
  });

  return {
    messages,
  };
}

export function meta() {
  return makeMeta({
    title: "Unanswered Messages - Admin",
  });
}

function MessagesTable({
  messages,
}: {
  messages: (Message & {
    ownerUser: { id: string; email: string };
    scrape: { id: string; title: string | null };
    thread: { id: string };
  })[];
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
            <th>Id</th>
            <th>Message</th>
            <th>Channel</th>
            <th>LLM</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((message, index) => (
            <tr key={message.id} data-message-id={message.id}>
              <td>
                <Link
                  to={`/admin-fowl/collection/${message.scrape.id}`}
                  className="link link-primary link-hover"
                >
                  {message.scrape.title}
                </Link>
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "tooltip",
                      index < 10 && "first:tooltip-bottom"
                    )}
                    data-tip={getQueryString(
                      (message.llmMessage as any).content
                    )}
                  >
                    {message.id.substring(message.id.length - 4)}
                  </div>
                  <button
                    className="btn btn-xs btn-square"
                    onClick={() => handleCopy(message.id)}
                  >
                    <TbCopy />
                  </button>
                </div>
              </td>
              <td>
                <div className="max-w-md truncate">
                  {getQueryString((message.llmMessage as any).content)}
                </div>
              </td>
              <td>{message.channel ?? "chatbot"}</td>
              <td>
                {`${message.llmModel ?? "-"}, ${message.creditsUsed ?? "-"}`}
              </td>
              <td>{message.createdAt.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function UnansweredMessages({
  loaderData,
}: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <MessagesTable messages={loaderData.messages} />
      <Toaster />
    </div>
  );
}

import type { Scrape } from "@packages/common/prisma";
import { prisma } from "@packages/common/prisma";
import { PLAN_FREE, planMap } from "@packages/common/user-plan";
import { Link, redirect } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { DataList } from "~/components/data-list";
import { makeMeta } from "~/meta";
import { getUserMessageCredits } from "~/user-message-credits";
import type { Route } from "./+types/user";
import { adminEmails } from "./emails";

export async function loader({ request, params }: Route.LoaderArgs) {
  const loggedInUser = await getAuthUser(request);

  if (!adminEmails.includes(loggedInUser!.email)) {
    throw redirect("/app");
  }

  const user = await prisma.user.findFirstOrThrow({
    where: {
      id: params.userId,
    },
  });

  const scrapes = await prisma.scrape.findMany({
    where: {
      userId: params.userId,
    },
  });

  const plan = planMap[user.plan?.planId ?? PLAN_FREE.id];

  const messageCredits = await getUserMessageCredits(user.id);

  return { user, scrapes, plan, messageCredits };
}

export function meta() {
  return makeMeta({
    title: "User - Admin",
  });
}

function CollectionsTable({ scrapes }: { scrapes: Scrape[] }) {
  return (
    <div className="overflow-x-auto border border-base-300 rounded-box bg-base-100 shadow">
      <table className="table">
        <thead>
          <tr>
            <th>Id</th>
            <th>Name</th>
            <th>LLM Model</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {scrapes.map((scrape) => (
            <tr key={scrape.id}>
              <td>{scrape.id}</td>
              <td>
                <Link
                  to={`/admin-fowl/collection/${scrape.id}`}
                  className="link link-primary link-hover"
                >
                  {scrape.title}
                </Link>
              </td>
              <td>{scrape.llmModel}</td>
              <td>{scrape.createdAt.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function User({ loaderData }: Route.ComponentProps) {
  const { user, scrapes, plan, messageCredits } = loaderData;
  return (
    <div className="p-4 flex flex-col gap-2">
      <div className="text-2xl font-bold">Details</div>
      <DataList
        data={[
          { label: "Email", value: user.email },
          { label: "Name", value: user.name },
          {
            label: "Message credits",
            value: `${messageCredits.balance} / ${messageCredits.total}`,
          },
          { label: "Created At", value: user.createdAt.toLocaleString() },
          { label: "Plan", value: user.plan?.planId },
          {
            label: "Plan activated at",
            value: user.plan?.activatedAt.toLocaleString() ?? "-",
          },
          {
            label: "Plan credits reset at",
            value: user.plan?.creditsResetAt?.toLocaleString() ?? "-",
          },
          { label: "Pages limit", value: user.plan?.limits?.pages },
          {
            label: "Members limit",
            value: user.plan?.limits?.teamMembers,
          },
          { label: "Collections limit", value: user.plan?.limits?.scrapes },
          { label: "Collections", value: scrapes.length },
        ]}
      />
      <div className="text-2xl font-bold">Collections</div>
      <CollectionsTable scrapes={scrapes} />
    </div>
  );
}

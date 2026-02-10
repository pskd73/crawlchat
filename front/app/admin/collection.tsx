import { getAuthUser } from "~/auth/middleware";
import type { Route } from "./+types/collection";
import { redirect, useLoaderData } from "react-router";
import { prisma } from "@packages/common/prisma";
import { getTotalPageChunks } from "~/knowledge/group/page-chunks";
import { DataList } from "~/components/data-list";
import { makeMeta } from "~/meta";
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

export async function loader({ request, params }: Route.LoaderArgs) {
  const loggedInUser = await getAuthUser(request);

  if (!adminEmails.includes(loggedInUser!.email)) {
    throw redirect("/app");
  }

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: {
      id: params.collectionId,
    },
    include: {
      user: true,
      knowoledgeGroups: true,
    },
  });

  const items = await Promise.all(
    scrape.knowoledgeGroups.map(async (group) => {
      return {
        id: group.id,
        count: await prisma.scrapeItem.count({
          where: {
            knowledgeGroupId: group.id,
          },
        }),
      };
    })
  );
  const itemsCount: Record<string, number> = {};
  for (const item of items) {
    itemsCount[item.id] = item.count;
  }

  const pageChunks: Record<string, number> = {};
  for (const group of scrape.knowoledgeGroups) {
    pageChunks[group.id] = await getTotalPageChunks(group.id);
  }

  const dailyMessages = await Promise.all(
    Array.from({ length: 30 }).map(async (_, index) => {
      const now = moment();
      const dayTime = now.subtract(index, "days");
      const startOfDay = dayTime.clone().startOf("day");
      const endOfDay = dayTime.clone().endOf("day");
      return {
        name: startOfDay.format("YYYY-MM-DD"),
        count: await prisma.message.count({
          where: {
            scrapeId: scrape.id,
            createdAt: { gte: startOfDay.toDate(), lte: endOfDay.toDate() },
            llmMessage: {
              is: {
                role: "user",
              },
            },
          },
        }),
      };
    })
  );

  return { scrape, itemsCount, pageChunks, dailyMessages };
}

export function meta() {
  return makeMeta({
    title: "Collection - Admin",
  });
}

function CategoriesTable() {
  const { scrape } = useLoaderData<typeof loader>();

  return (
    <div className="overflow-x-auto border border-base-300 rounded-box bg-base-100 shadow">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {scrape.messageCategories.map((category, index) => (
            <tr key={index}>
              <td>{category.title}</td>
              <td>{category.description}</td>
              <td>{category.createdAt.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupsTable() {
  const { itemsCount, pageChunks, scrape } = useLoaderData<typeof loader>();

  return (
    <div className="overflow-x-auto border border-base-300 rounded-box bg-base-100 shadow">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Pages</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {scrape.knowoledgeGroups.map((group, index) => (
            <tr key={index}>
              <td>{group.title}</td>
              <td>{group.type}</td>
              <td>
                {pageChunks[group.id] ?? 0}({itemsCount[group.id]})
              </td>
              <td>{group.createdAt.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MessagesChart() {
  const { dailyMessages } = useLoaderData<typeof loader>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.clientWidth - 60);
    }
  }, [containerRef]);

  return (
    <div ref={containerRef}>
      {width && (
        <BarChart width={width} height={300} data={dailyMessages}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" reversed />
          <YAxis dataKey="count" />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#8884d8" />
        </BarChart>
      )}
    </div>
  );
}

export default function Collection({ loaderData }: Route.ComponentProps) {
  const { scrape, itemsCount } = loaderData;

  return (
    <div className="p-4 flex flex-col gap-2">
      <div className="text-2xl font-bold">Details</div>
      <DataList
        data={[
          { label: "Id", value: scrape.id },
          { label: "Name", value: scrape.title },
          { label: "LLM Model", value: scrape.llmModel },
          { label: "Created At", value: scrape.createdAt.toLocaleString() },
          { label: "User", value: scrape.user.email },
          {
            label: "Pages",
            value: Object.values(itemsCount).reduce(
              (acc, count) => acc + count,
              0
            ),
          },
        ]}
      />

      <div className="text-2xl font-bold">Messages</div>
      <MessagesChart />

      <div className="text-2xl font-bold">Groups</div>
      <GroupsTable />

      <div className="text-2xl font-bold">Categories</div>
      <CategoriesTable />
    </div>
  );
}

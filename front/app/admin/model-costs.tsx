import { prisma } from "@packages/common/prisma";
import { Link, redirect } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { makeMeta } from "~/meta";
import type { Route } from "./+types/model-costs";
import { adminEmails } from "./emails";

type ModelCostStat = {
  model: string;
  avgCost: number;
  totalCost: number;
  count: number;
};

export async function loader({ request }: Route.LoaderArgs) {
  const loggedInUser = await getAuthUser(request);

  if (!adminEmails.includes(loggedInUser!.email)) {
    throw redirect("/app");
  }

  const rawModelCosts = (await prisma.message.aggregateRaw({
    pipeline: [
      {
        $match: {
          llmModel: { $ne: null },
          llmCost: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$llmModel",
          avgCost: { $avg: "$llmCost" },
          totalCost: { $sum: "$llmCost" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { avgCost: -1 },
      },
    ],
  })) as unknown as Array<{
    _id: string;
    avgCost?: number;
    totalCost?: number;
    count?: number;
  }>;

  const modelCosts: ModelCostStat[] = rawModelCosts.map((item) => ({
    model: item._id,
    avgCost: Number(item.avgCost ?? 0),
    totalCost: Number(item.totalCost ?? 0),
    count: Number(item.count ?? 0),
  }));

  const totalMessages = modelCosts.reduce((sum, item) => sum + item.count, 0);
  const totalCost = modelCosts.reduce((sum, item) => sum + item.totalCost, 0);
  const overallAverageCost = totalMessages > 0 ? totalCost / totalMessages : 0;

  return {
    modelCosts,
    totalMessages,
    totalCost,
    overallAverageCost,
  };
}

export function meta() {
  return makeMeta({
    title: "Model Costs - Admin",
  });
}

export default function ModelCosts({ loaderData }: Route.ComponentProps) {
  const { modelCosts, totalMessages, totalCost, overallAverageCost } =
    loaderData;

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Model Costs</h1>
        <Link to="/admin-fowl" className="link link-primary link-hover">
          Back to Admin
        </Link>
      </div>

      <div className="stats shadow bg-base-100 border border-base-300">
        <div className="stat">
          <div className="stat-title">Total messages</div>
          <div className="stat-value text-2xl">{totalMessages}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Total cost</div>
          <div className="stat-value text-2xl">${totalCost.toFixed(4)}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Overall average cost</div>
          <div className="stat-value text-2xl">
            ${overallAverageCost.toFixed(6)}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-base-300 rounded-box bg-base-100 shadow">
        <table className="table">
          <thead>
            <tr>
              <th>Model</th>
              <th className="text-right">Messages</th>
              <th className="text-right">Average Cost</th>
              <th className="text-right">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {modelCosts.map((item) => (
              <tr key={item.model}>
                <td>{item.model}</td>
                <td className="text-right">{item.count}</td>
                <td className="text-right">${item.avgCost.toFixed(6)}</td>
                <td className="text-right">${item.totalCost.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

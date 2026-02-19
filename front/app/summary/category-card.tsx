import cn from "@meltdownjs/cn";
import moment from "moment";
import { useMemo } from "react";
import { TbFolder } from "react-icons/tb";
import { Link } from "react-router";
import { Line, LineChart, Tooltip, XAxis } from "recharts";
import type { MessagesSummary } from "~/messages-summary";
import CategoryCardStat from "./category-card-stat";

export default function CategoryCard({
  title,
  summary,
}: {
  title: string;
  summary: MessagesSummary;
}) {
  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    const DAY_MS = 1000 * 60 * 60 * 24;

    for (let i = 0; i < 14; i++) {
      const date = new Date(today.getTime() - i * DAY_MS);
      const key = date.toISOString().split("T")[0];
      const name = moment(date).format("MMM D");
      data.push({
        name,
        Messages: summary.dailyMessages[key]?.count ?? 0,
      });
    }
    return data.reverse();
  }, [summary.dailyMessages]);

  function renderTooltip(props: any) {
    return (
      <div className="bg-primary text-primary-content px-3 py-1 rounded-box">
        <div className="text-[8px] opacity-80">{props.label}</div>
        <div className="text-xs">{props.payload[0]?.value}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-base-100 rounded-box p-4 border border-base-300",
        "flex flex-col md:flex-row justify-between gap-2 md:items-center"
      )}
    >
      <div className="h-fit">
        <Link
          to={`/questions?category=${encodeURIComponent(title)}`}
          className="flex items-center gap-2 link link-primary link-hover"
        >
          <TbFolder />
          <span className="font-bold">{title}</span>
        </Link>
      </div>

      <div className="flex gap-4 flex-wrap">
        <LineChart width={160} height={40} data={chartData}>
          <XAxis dataKey="name" hide />
          <Tooltip content={renderTooltip} />
          <Line
            type="monotone"
            dataKey="Messages"
            stroke={"var(--color-primary)"}
            dot={false}
          />
        </LineChart>
        <CategoryCardStat label="This week" value={summary.messagesCount} />
        <CategoryCardStat label="Today" value={summary.messagesToday} />
        <CategoryCardStat
          label="Avg score"
          value={summary.avgScore?.toFixed(2) ?? "-"}
          error={summary.avgScore ? summary.avgScore < 0.3 : undefined}
          tooltip={"Avg of max scores for all queries"}
        />
        <CategoryCardStat label="Not helpful" value={summary.ratingDownCount} />
      </div>
    </div>
  );
}

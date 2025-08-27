import cn from "@meltdownjs/cn";
import { TbChartBar } from "react-icons/tb";

export function ScoreBadge({ score }: { score: number }) {
  return (
    <div
      className={cn(
        "badge badge-soft",
        score <= 0.25 && "badge-error",
        score <= 0.5 && "badge-warning",
        score <= 0.75 && "badge-info",
        score <= 1 && "badge-primary"
      )}
    >
      <TbChartBar />
      {score.toFixed(2)}
    </div>
  );
}

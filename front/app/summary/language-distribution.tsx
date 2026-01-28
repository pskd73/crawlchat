import cn from "@meltdownjs/cn";
import { useMemo } from "react";
import { Pie, PieChart, Tooltip } from "recharts";
import { BRIGHT_COLORS, Heading } from "~/summary";

export default function LanguageDistribution({
  languages,
}: {
  languages: Record<string, number>;
}) {
  const data = useMemo(() => {
    return Object.entries(languages).map(([key, val], index) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      count: val,
      fill: BRIGHT_COLORS[index % BRIGHT_COLORS.length],
    }));
  }, [languages]);

  if (Object.keys(languages).length == 0) {
    return null;
  }

  return (
    <div style={{ width: "100%" }}>
      <Heading>Languages</Heading>

      <div
        className={cn(
          "w-fit bg-base-100 border border-base-300 rounded-box p-4"
        )}
      >
        <PieChart width={200} height={200}>
          <Pie
            data={data}
            innerRadius="80%"
            outerRadius="100%"
            cornerRadius="50%"
            fill="#8884d8"
            paddingAngle={5}
            dataKey="count"
            isAnimationActive={true}
          />
          <Tooltip />
        </PieChart>
      </div>
    </div>
  );
}

import type React from "react";

export function DataList({
  data,
}: {
  data: Array<{
    label: React.ReactNode;
    value: React.ReactNode;
  }>;
}) {
  return (
    <div className="flex flex-col gap-2">
      {data.map((item, index) => (
        <div className="flex gap-2" key={index}>
          <div className="w-32 text-base-content/50">{item.label}</div>
          <div className="flex-1">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

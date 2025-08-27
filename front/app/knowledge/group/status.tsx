import type { KnowledgeGroupStatus } from "libs/prisma";
import { useMemo } from "react";
import { TbBook, TbCheck, TbLoader, TbX } from "react-icons/tb";
import cn from "@meltdownjs/cn";

export function GroupStatus({ status }: { status: KnowledgeGroupStatus }) {
  const ui = useMemo(() => {
    if (status === "pending") {
      return {
        icon: <TbBook />,
        text: "To be processed",
      };
    } else if (status === "done") {
      return {
        icon: <TbCheck />,
        text: "Up to date",
      };
    } else if (status === "error") {
      return {
        icon: <TbX />,
        text: "Error",
      };
    } else if (status === "processing") {
      return {
        icon: <TbLoader />,
        text: "Updating",
      };
    }

    return {
      icon: <TbBook />,
      text: "Unknown",
    };
  }, [status]);

  return (
    <div
      className={cn(
        "badge badge-soft",
        status === "done" && "badge-success",
        status === "error" && "badge-error",
        status === "processing" && "badge-info",
        status === "pending" && "badge-warning"
      )}
    >
      {ui.icon}
      {ui.text}
    </div>
  );
}

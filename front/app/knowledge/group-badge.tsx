import type { KnowledgeGroupType } from "@prisma/client";
import { useMemo } from "react";
import {
  TbBook2,
  TbBrandDiscord,
  TbBrandSlack,
  TbPencil,
} from "react-icons/tb";
import { getSourceSpec } from "~/source-spec";

export function KnowledgeGroupBadge({
  type,
  subType = "default",
}: {
  type: KnowledgeGroupType;
  subType?: string;
}) {
  const [icon, text] = useMemo(() => {
    const sourceSpec = getSourceSpec(type, subType);

    if (sourceSpec) {
      return [sourceSpec.icon, sourceSpec.name];
    }
    if (type === "learn_discord") {
      return [<TbBrandDiscord />, "Discord"];
    }
    if (type === "learn_slack") {
      return [<TbBrandSlack />, "Slack"];
    }
    if (type === "answer_corrections") {
      return [<TbPencil />, "Corrections"];
    }

    return [<TbBook2 />, "Unknown"];
  }, [type]);
  return (
    <div className="badge badge-soft badge-primary">
      {icon}
      {text}
    </div>
  );
}

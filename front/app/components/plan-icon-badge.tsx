import type { UserPlan } from "@packages/common/prisma";
import { TbCrown } from "react-icons/tb";

export function PlanIconBadge({ userPlan }: { userPlan: UserPlan | null }) {
  return (
    userPlan?.type === "SUBSCRIPTION" &&
    userPlan.status === "ACTIVE" && (
      <div
        className="tooltip tooltip-left"
        data-tip={`On ${userPlan.planId} plan`}
      >
        <span className="badge badge-primary px-1 badge-soft">
          <TbCrown />
        </span>
      </div>
    )
  );
}

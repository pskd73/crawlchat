import { TbCrown } from "react-icons/tb";

export function PlanIconBadge({ planId }: { planId?: string }) {
  return (
    ["pro", "starter"].includes(planId ?? "") && (
      <div className="tooltip tooltip-left" data-tip={`On ${planId} plan`}>
        <span className="badge badge-primary px-1 badge-soft">
          <TbCrown />
        </span>
      </div>
    )
  );
}

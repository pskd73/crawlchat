import type { LlmModel } from "libs/prisma";
import { TbCoins } from "react-icons/tb";

export function CreditsUsedBadge({
  creditsUsed,
  llmModel,
}: {
  creditsUsed: number;
  llmModel?: LlmModel | null;
}) {
  return (
    <div className="tooltip" data-tip={llmModel}>
      <div className="badge badge-accent badge-soft px-2">
        <TbCoins />
        {creditsUsed}
      </div>
    </div>
  );
}

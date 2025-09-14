import type { Scrape, User } from "libs/prisma";
import type { Plan } from "libs/user-plan";
import { useEffect } from "react";
import { TbCrown } from "react-icons/tb";
import { useFetcher } from "react-router";
import { PricingBoxes } from "~/landing/page";

export function UpgradeModal({
  freePlan,
  starterPlan,
  proPlan,
  hobbyPlan,
  scrape,
  user,
}: {
  freePlan: Plan;
  starterPlan: Plan;
  proPlan: Plan;
  hobbyPlan: Plan;
  scrape?: Scrape;
  user: User;
}) {
  const paymentFetcher = useFetcher();

  useEffect(() => {
    if (scrape) return;
    if (user.plan?.planId !== "free") return;
    (document.getElementById("upgrade-modal") as HTMLInputElement).checked =
      true;
  }, []);

  useEffect(() => {
    if (paymentFetcher.data) {
      location.href = paymentFetcher.data.url;
    }
  }, [paymentFetcher.data]);

  function handlePayClick(planId: string) {
    paymentFetcher.submit(
      {
        intent: "payment-link",
        referralId: (window as any).affonso_referral,
        planId,
      },
      {
        method: "POST",
        action: "/app",
      }
    );
  }

  return (
    <>
      <input type="checkbox" id="upgrade-modal" className="modal-toggle" />
      <dialog className="modal z-90">
        <div className="modal-box w-11/12 max-w-5xl">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
            <TbCrown />
            Upgrade
          </h3>
          <p className="text-base-content/50 mb-4">
            Choose the plan that best fits your needs. Start your 7 days free
            trial using the <span className="font-bold">Hobby plan</span> if you
            want to explore the platform.
          </p>
          <div className="flex flex-col md:flex-row gap-4">
            <PricingBoxes
              freePlan={freePlan}
              starterPlan={starterPlan}
              proPlan={proPlan}
              hobbyPlan={hobbyPlan}
              onClick={handlePayClick}
            />
          </div>
          <div className="mt-2 flex justify-end">
            <a className="link text-xs link-hover" href="/logout">
              Logout
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}

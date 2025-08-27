import type { KnowledgeGroup } from "libs/prisma";
import { useEffect } from "react";
import { TbArrowRight, TbPlayerStopFilled, TbRefresh } from "react-icons/tb";
import { useFetcher } from "react-router";
import cn from "@meltdownjs/cn";
import toast from "react-hot-toast";

export function ActionButton({
  group,
  small = false,
}: {
  group: KnowledgeGroup;
  small?: boolean;
}) {
  const refreshFetcher = useFetcher();
  const stopFetcher = useFetcher();

  useEffect(() => {
    if (refreshFetcher.data?.success) {
      toast.success("This group is added to fetch queue");
    }
  }, [refreshFetcher.data]);

  useEffect(() => {
    if (stopFetcher.data?.success) {
      toast.success("This group fetch is stopped");
    }
  }, [stopFetcher.data]);

  if (
    !["scrape_web", "scrape_github", "github_issues", "notion"].includes(
      group.type
    )
  ) {
    return null;
  }

  return (
    <>
      {["done", "pending", "error"].includes(group.status) && (
        <refreshFetcher.Form
          method="post"
          action={`/knowledge/group/${group.id}`}
        >
          <input type="hidden" name="intent" value="refresh" />
          <div
            className={cn("tooltip", !small && "tooltip-left")}
            data-tip="Refetch it"
          >
            {group.status === "pending" ? (
              <button
                className={cn("btn btn-primary", small && "btn-xs")}
                type="submit"
                disabled={refreshFetcher.state !== "idle"}
              >
                Fetch now
                <TbArrowRight />
              </button>
            ) : (
              <button
                className={cn("btn btn-square", small && "btn-xs")}
                type="submit"
                disabled={refreshFetcher.state !== "idle"}
              >
                <TbRefresh />
              </button>
            )}
          </div>
        </refreshFetcher.Form>
      )}
      {["processing"].includes(group.status) && (
        <stopFetcher.Form method="post" action={`/knowledge/group/${group.id}`}>
          <input type="hidden" name="intent" value="stop" />
          <div
            className={cn("tooltip", !small && "tooltip-left")}
            data-tip="Stop fetching"
          >
            <button
              className={cn(
                "btn btn-error btn-square btn-soft",
                small && "btn-xs"
              )}
              type="submit"
              disabled={stopFetcher.state !== "idle"}
            >
              <TbPlayerStopFilled />
            </button>
          </div>
        </stopFetcher.Form>
      )}
    </>
  );
}

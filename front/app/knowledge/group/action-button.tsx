import type { KnowledgeGroup, KnowledgeGroupStatus } from "libs/prisma";
import { useEffect, useState } from "react";
import { TbArrowRight, TbPlayerStopFilled, TbRefresh } from "react-icons/tb";
import { useFetcher } from "react-router";
import cn from "@meltdownjs/cn";
import toast from "react-hot-toast";

function useProcessStatus(
  knowledgeGroupId: string,
  processId: string | null,
  token: string
) {
  const [status, setStatus] = useState<{
    pending: number;
    status: KnowledgeGroupStatus;
  }>();

  useEffect(() => {
    (async () => {
      while (true) {
        const response = await fetch(
          `${window.ENV.VITE_SOURCE_SYNC_URL}/process-status?knowledgeGroupId=${knowledgeGroupId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await response.json();
        setStatus(data);
        if (data.status !== "processing") {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    })();
  }, [knowledgeGroupId, processId, token]);

  return status;
}

export function ActionButton({
  group,
  token,
  small = false,
}: {
  group: KnowledgeGroup;
  token: string;
  small?: boolean;
}) {
  const refreshFetcher = useFetcher();
  const stopFetcher = useFetcher();
  const processStatus = useProcessStatus(
    group.id,
    group.updateProcessId,
    token
  );

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
    [
      "custom",
      "upload",
      "learn_discord",
      "learn_slack",
      "answer_corrections",
    ].includes(group.type)
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
      {group.status === "processing" && (
        <div className="flex items-center gap-4">
          {!small && processStatus && processStatus.pending > 0 && (
            <div
              className="tooltip tooltip-left flex items-center gap-2"
              data-tip="Pending items"
            >
              <span
                className={cn("loading loading-sm", small && "loading-xs")}
              />
              <span>{processStatus.pending}</span>
            </div>
          )}
          <stopFetcher.Form
            method="post"
            action={`/knowledge/group/${group.id}`}
          >
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
        </div>
      )}
    </>
  );
}

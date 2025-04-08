import { IconButton } from "@chakra-ui/react";
import type { KnowledgeGroup } from "libs/prisma";
import { useEffect } from "react";
import { TbPlayerStopFilled, TbRefresh } from "react-icons/tb";
import { useFetcher } from "react-router";
import { toaster } from "~/components/ui/toaster";
import { Tooltip } from "~/components/ui/tooltip";

export function ActionButton({
  group,
  buttonSize = "xs",
}: {
  group: KnowledgeGroup;
  buttonSize?: "xs" | "sm" | "md" | "lg";
}) {
  const refreshFetcher = useFetcher();
  const stopFetcher = useFetcher();

  useEffect(() => {
    if (refreshFetcher.data?.success) {
      toaster.success({
        title: "Refresh initiated!",
      });
    }
  }, [refreshFetcher.data]);

  useEffect(() => {
    if (refreshFetcher.data?.success) {
      toaster.success({
        title: "Group stopped!",
      });
    }
  }, [stopFetcher.data]);

  console.log(group.status);

  return (
    <>
      {["done", "pending", "error"].includes(group.status) && (
        <refreshFetcher.Form
          method="post"
          action={`/knowledge/group/${group.id}`}
        >
          <input type="hidden" name="intent" value="refresh" />
          <Tooltip showArrow content="Update the items of the group">
            <IconButton
              size={buttonSize}
              variant={"subtle"}
              type="submit"
              disabled={refreshFetcher.state !== "idle"}
            >
              <TbRefresh />
            </IconButton>
          </Tooltip>
        </refreshFetcher.Form>
      )}
      {["processing"].includes(group.status) && (
        <stopFetcher.Form method="post" action={`/knowledge/group/${group.id}`}>
          <input type="hidden" name="intent" value="stop" />
          <Tooltip showArrow content="Stop the processing">
            <IconButton
              size={buttonSize}
              variant={"subtle"}
              type="submit"
              disabled={stopFetcher.state !== "idle"}
              colorPalette={"red"}
            >
              <TbPlayerStopFilled />
            </IconButton>
          </Tooltip>
        </stopFetcher.Form>
      )}
    </>
  );
}

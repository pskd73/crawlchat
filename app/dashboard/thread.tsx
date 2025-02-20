import { IconButton, Stack } from "@chakra-ui/react";
import type { Route } from "./+types/thread";
import { prisma } from "~/prisma";
import { redirect, useFetcher } from "react-router";
import ChatBox from "./chat-box";
import { getAuthUser } from "~/auth/middleware";
import { createToken } from "~/jwt";
import { Page } from "~/components/page";
import { getThreadName } from "~/thread-util";
import { useContext, useEffect, useState } from "react";
import { AppContext } from "./context";
import { TbCheck, TbMessage, TbTrash } from "react-icons/tb";
import type { ResponseType, Prisma } from "@prisma/client";

export async function loader({ params, request }: Route.LoaderArgs) {
  const thread = await prisma.thread.findUnique({
    where: { id: params.id },
  });
  if (!thread) {
    throw redirect("/app");
  }
  const user = await getAuthUser(request, { userId: thread.userId });
  if (!user) {
    throw redirect("/app");
  }
  const token = createToken(user.id);
  const scrape = await prisma.scrape.findUnique({
    where: { id: thread.scrapeId },
  });
  return { thread, token, scrape };
}

export async function action({ params, request }: Route.ActionArgs) {
  if (request.method === "DELETE") {
    await prisma.thread.delete({
      where: { id: params.id },
    });
    return redirect("/app");
  }
  if (request.method === "PATCH") {
    const formData = await request.formData();
    const responseType = formData.get("responseType");

    const update: Prisma.ThreadUpdateInput = {};
    if (responseType) {
      update.responseType = responseType as ResponseType;
    }

    await prisma.thread.update({
      where: { id: params.id },
      data: update,
    });
  }
}

export default function ThreadPage({ loaderData }: Route.ComponentProps) {
  const deleteFetcher = useFetcher();
  const { threadTitle } = useContext(AppContext);
  const [deleteActive, setDeleteActive] = useState(false);

  useEffect(() => {
    if (deleteActive) {
      setTimeout(() => {
        setDeleteActive(false);
      }, 3000);
    }
  }, [deleteActive]);

  function handleDelete() {
    if (!deleteActive) {
      setDeleteActive(true);
      return;
    }
    deleteFetcher.submit(null, {
      method: "delete",
    });
  }

  return (
    <Page
      title={
        threadTitle[loaderData.thread.id] ??
        getThreadName(loaderData.thread.messages)
      }
      icon={<TbMessage />}
      right={
        <IconButton
          size={"xs"}
          variant={"subtle"}
          onClick={handleDelete}
          colorPalette={
            deleteActive || deleteFetcher.state !== "idle" ? "red" : undefined
          }
          disabled={deleteFetcher.state !== "idle"}
        >
          {deleteActive || deleteFetcher.state !== "idle" ? (
            <TbCheck />
          ) : (
            <TbTrash />
          )}
        </IconButton>
      }
    >
      <Stack h="full">
        <ChatBox
          userToken={loaderData.token}
          thread={loaderData.thread}
          scrape={loaderData.scrape!}
          key={loaderData.thread.id}
        />
      </Stack>
    </Page>
  );
}

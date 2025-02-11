import { Stack } from "@chakra-ui/react";
import type { Route } from "./+types/thread";
import { prisma } from "~/prisma";
import { redirect, useFetcher } from "react-router";
import ChatBox from "./chat-box";

export async function loader({ params }: Route.LoaderArgs) {
  const thread = await prisma.thread.findUnique({
    where: { id: params.id },
  });
  if (!thread) {
    throw redirect("/app");
  }
  return { thread };
}

export async function action({ params }: Route.ActionArgs) {
  await prisma.thread.delete({
    where: { id: params.id },
  });
  return redirect("/app");
}

export default function Thread({ loaderData }: Route.ComponentProps) {
  const deleteFetcher = useFetcher();

  function handleDelete() {
    deleteFetcher.submit(null, {
      method: "delete",
    });
  }

  return (
    <Stack p={8} h="full">
      <ChatBox
        thread={loaderData.thread}
        key={loaderData.thread.id}
        deleting={deleteFetcher.state !== "idle"}
        onDelete={handleDelete}
      />
    </Stack>
  );
}

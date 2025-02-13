import { Group, Stack, Text } from "@chakra-ui/react";
import type { Route } from "./+types/thread";
import { prisma } from "~/prisma";
import { redirect, useFetcher } from "react-router";
import ChatBox from "./chat-box";
import { getAuthUser } from "~/auth/middleware";
import { createToken } from "~/jwt";

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
  return { thread, token };
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
      <Stack maxW={"700px"}>
        <ChatBox
          token={loaderData.token}
          thread={loaderData.thread}
          key={loaderData.thread.id}
          deleting={deleteFetcher.state !== "idle"}
          onDelete={handleDelete}
        />
      </Stack>
    </Stack>
  );
}

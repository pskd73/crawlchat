import { Input, Stack, Text, Textarea } from "@chakra-ui/react";
import { useFetcher } from "react-router";
import { SettingsSection } from "~/dashboard/settings";
import { prisma } from "~/prisma";
import type { Route } from "./+types/scrape-settings";
import { getAuthUser } from "~/auth/middleware";
import type { Prisma } from "@prisma/client";

export async function loader({ params, request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  const scrape = await prisma.scrape.findUnique({
    where: { id: params.id, userId: user!.id },
  });

  if (!scrape) {
    throw new Response("Not found", { status: 404 });
  }

  return { scrape };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const formData = await request.formData();

  const chatPrompt = formData.get("chatPrompt") as string | null;
  const title = formData.get("title") as string | null;

  const update: Prisma.ScrapeUpdateInput = {};
  if (chatPrompt) {
    update.chatPrompt = chatPrompt;
  }
  if (title) {
    update.title = title;
  }

  const scrape = await prisma.scrape.update({
    where: { id: params.id, userId: user!.id },
    data: update,
  });

  return { scrape };
}

export default function ScrapeSettings({ loaderData }: Route.ComponentProps) {
  const promptFetcher = useFetcher();
  const nameFetcher = useFetcher();
  return (
    <Stack gap={4}>
      <SettingsSection
        title="Name"
        description="Give it a name. It will be shown on chat screen."
        fetcher={nameFetcher}
      >
        <Input
          name="title"
          defaultValue={loaderData.scrape.title ?? ""}
          placeholder="Enter a name for this scrape."
        />
      </SettingsSection>
      <SettingsSection
        title="Chat Prompt"
        description="Customize the chat prompt for this scrape."
        fetcher={promptFetcher}
      >
        <Textarea
          name="chatPrompt"
          defaultValue={loaderData.scrape.chatPrompt ?? ""}
          placeholder="Enter a custom chat prompt for this scrape."
        />
      </SettingsSection>
    </Stack>
  );
}

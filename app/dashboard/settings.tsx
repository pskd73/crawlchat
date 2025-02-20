import { Page } from "~/components/page";
import { TbCheck, TbSettings } from "react-icons/tb";
import { Group, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { useFetcher, type FetcherWithComponents } from "react-router";
import { Button } from "~/components/ui/button";
import type { Route } from "./+types/settings";
import { getAuthUser } from "~/auth/middleware";
import type { UserSettings } from "@prisma/client";
import { prisma } from "~/prisma";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  return { user: user! };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);

  const formData = await request.formData();
  const openaiApiKey = formData.get("openaiApiKey");
  const systemPrompt = formData.get("systemPrompt");

  const update: Partial<UserSettings> = {};

  if (openaiApiKey !== null) {
    update.openaiApiKey = openaiApiKey as string;
  }
  if (systemPrompt !== null) {
    update.systemPrompt = systemPrompt as string;
  }

  await prisma.user.update({
    where: { id: user!.id },
    data: { settings: { ...user!.settings, ...update } },
  });

  return Response.json({ success: true });
}

export function SettingsSection({
  children,
  fetcher,
  title,
  description,
}: {
  children: React.ReactNode;
  fetcher: FetcherWithComponents<unknown>;
  title?: string;
  description?: string;
}) {
  return (
    <fetcher.Form method="post">
      <Stack
        border={"1px solid"}
        borderColor={"brand.outline"}
        borderRadius={"md"}
        overflow={"hidden"}
      >
        <Stack p={4} gap={4}>
          <Stack>
            {title && <Heading size={"md"}>{title}</Heading>}
            {description && (
              <Text opacity={0.5} fontSize={"sm"}>
                {description}
              </Text>
            )}
          </Stack>
          {children}
        </Stack>
        <Group
          p={4}
          py={3}
          borderTop={"1px solid"}
          borderColor={"brand.outline"}
          bg="brand.gray.100"
          w="full"
          justifyContent={"space-between"}
        >
          <Group></Group>
          <Button type="submit" size={"xs"} loading={fetcher.state !== "idle"}>
            Save
            <TbCheck />
          </Button>
        </Group>
      </Stack>
    </fetcher.Form>
  );
}

export default function SettingsPage({ loaderData }: Route.ComponentProps) {
  const openaiApiKeyFetcher = useFetcher();
  const systemPromptFetcher = useFetcher();

  return (
    <Page title="Settings" icon={<TbSettings />}>
      <Stack maxW={"1000px"} gap={8}>
        <SettingsSection
          fetcher={openaiApiKeyFetcher}
          title="OpenAI API Key"
          description="Enter your OpenAI API key to use the AI features."
        >
          <Stack>
            <Input
              name="openaiApiKey"
              placeholder="Ex: sk-..."
              defaultValue={loaderData.user.settings?.openaiApiKey ?? ""}
            />
          </Stack>
        </SettingsSection>

        <SettingsSection
          fetcher={systemPromptFetcher}
          title="System Prompt"
          description="Enter a system prompt that will be used for all threads while chatting."
        >
          <Stack>
            <Input
              name="systemPrompt"
              placeholder="Ex: You are a helpful assistant."
              defaultValue={loaderData.user.settings?.systemPrompt ?? ""}
            />
          </Stack>
        </SettingsSection>
      </Stack>
    </Page>
  );
}

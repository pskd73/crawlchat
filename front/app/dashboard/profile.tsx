import { Page } from "~/components/page";
import { TbSettings } from "react-icons/tb";
import { Stack } from "@chakra-ui/react";
import { useFetcher } from "react-router";
import type { Route } from "./+types/profile";
import { getAuthUser } from "~/auth/middleware";
import type { UserSettings } from "libs/prisma";
import { prisma } from "~/prisma";
import { Switch } from "~/components/ui/switch";
import { SettingsSection } from "~/settings-section";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  return { user: user! };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);

  const formData = await request.formData();
  const intent = formData.get("intent");
  const openaiApiKey = formData.get("openaiApiKey");
  const weeklyUpdates = formData.get("weeklyUpdates");

  const update: Partial<UserSettings> = {};

  if (openaiApiKey !== null) {
    update.openaiApiKey = openaiApiKey as string;
  }
  if (intent === "weekly-updates") {
    update.weeklyUpdates = weeklyUpdates === "on";
  }

  await prisma.user.update({
    where: { id: user!.id },
    data: { settings: { ...user!.settings, ...update } },
  });

  return Response.json({ success: true });
}

export default function SettingsPage({ loaderData }: Route.ComponentProps) {
  const openaiApiKeyFetcher = useFetcher();

  return (
    <Page title="Profile" icon={<TbSettings />}>
      <Stack gap={8}>
        <SettingsSection
          fetcher={openaiApiKeyFetcher}
          title="Weekly Updates"
          description="Enable weekly updates to be sent to your email."
        >
          <Stack>
            <input type="hidden" name="intent" value="weekly-updates" />
            <Switch
              name="weeklyUpdates"
              defaultChecked={loaderData.user.settings?.weeklyUpdates ?? true}
            >
              Receive weekly email summary
            </Switch>
          </Stack>
        </SettingsSection>
      </Stack>
    </Page>
  );
}

import type { Prisma } from "libs/prisma";
import type { Route } from "./+types/settings";
import { redirect, useFetcher } from "react-router";
import { TbSettings } from "react-icons/tb";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/settings-section";
import { Page } from "~/components/page";
import { getAuthUser } from "~/auth/middleware";
import { getSession } from "~/session";
import { prisma } from "~/prisma";
import { getSessionScrapeId } from "~/scrapes/util";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  const session = await getSession(request.headers.get("cookie"));
  const scrapeId = session.get("scrapeId");

  if (!scrapeId) {
    throw redirect("/app");
  }

  const scrape = await prisma.scrape.findUnique({
    where: { id: scrapeId, userId: user!.id },
  });

  if (!scrape) {
    throw new Response("Not found", { status: 404 });
  }

  return { scrape, user: user! };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const formData = await request.formData();

  const scrapeId = await getSessionScrapeId(request);

  const update: Prisma.ScrapeUpdateInput = {};

  if (formData.has("resolveQuestion")) {
    update.resolveQuestion = formData.get("resolveQuestion") as string;
  }
  if (formData.has("resolveDescription")) {
    update.resolveDescription = formData.get("resolveDescription") as string;
  }

  const scrape = await prisma.scrape.update({
    where: { id: scrapeId, userId: user!.id },
    data: update,
  });

  return { scrape };
}

export default function TicketsSettings({ loaderData }: Route.ComponentProps) {
  const customEnquiryFetcher = useFetcher();

  return (
    <Page title="Ticket settings" icon={<TbSettings />}>
      <SettingsSectionProvider>
        <SettingsContainer>
          <SettingsSection
            title="Custom enquiry"
            id="custom-enquiry"
            description="The users gets prompted if the query is resolved by the chatbot. If they say no, it takes them to form to create a support ticket. You can customise the question and description that is shown to the user."
            fetcher={customEnquiryFetcher}
          >
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Question</legend>
              <input
                className="input"
                type="text"
                name="resolveQuestion"
                defaultValue={loaderData.scrape.resolveQuestion ?? ""}
                placeholder="Enter the question to ask if issue resolved"
              />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Description</legend>
              <input
                className="input"
                type="text"
                name="resolveDescription"
                defaultValue={loaderData.scrape.resolveDescription ?? ""}
                placeholder="A description"
              />
            </fieldset>
          </SettingsSection>
        </SettingsContainer>
      </SettingsSectionProvider>
    </Page>
  );
}

import { prisma } from "@packages/common/prisma";
import { TbPointerPlus } from "react-icons/tb";
import { redirect, useFetcher } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { Page } from "~/components/page";
import { makeMeta } from "~/meta";
import type { Route } from "./+types/new";
import { EditForm } from "./edit-form";
import { SaveForm } from "./save-form";
import { EditActionProvider } from "./use-edit-action";

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const data = JSON.parse(formData.get("data") as string);

  await prisma.apiAction.create({
    data: {
      scrapeId,
      userId: user!.id,
      title: data.title,
      url: data.url,
      method: data.method,
      data: data.data,
      headers: data.headers,
      description: data.description,
      type: data.type,
      calConfig: data.calConfig,
      requireEmailVerification: data.requireEmailVerification,
    },
  });

  throw redirect(`/actions`);
}

export function meta() {
  return makeMeta({
    title: "New Action - CrawlChat",
  });
}

export default function NewAction() {
  const fetcher = useFetcher();

  return (
    <EditActionProvider>
      <Page
        title="New Action"
        icon={<TbPointerPlus />}
        right={<SaveForm fetcher={fetcher} />}
      >
        <EditForm />
      </Page>
    </EditActionProvider>
  );
}

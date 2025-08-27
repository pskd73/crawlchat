import type { Route } from "./+types/new";
import { TbPointerPlus } from "react-icons/tb";
import { EditForm } from "./edit-form";
import { EditActionProvider } from "./use-edit-action";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "libs/prisma";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { redirect, useFetcher } from "react-router";
import { SaveForm } from "./save-form";
import { Page } from "~/components/page";

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const data = JSON.parse(formData.get("data") as string);

  const action = await prisma.apiAction.create({
    data: {
      scrapeId,
      userId: user!.id,
      title: data.title,
      url: data.url,
      method: data.method,
      data: data.data,
      headers: data.headers,
      description: data.description,
    },
  });

  throw redirect(`/actions`);
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

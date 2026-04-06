import { prisma } from "@packages/common/prisma";
import { TbPointer } from "react-icons/tb";
import { redirect, useFetcher } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { Page } from "~/components/page";
import { makeMeta } from "~/meta";
import type { Route } from "./+types/edit";
import { EditForm } from "./edit-form";
import { SaveForm } from "./save-form";
import { EditActionProvider } from "./use-edit-action";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const action = await prisma.apiAction.findUnique({
    where: {
      id: params.actionId,
      scrapeId,
    },
  });

  return { action };
}

export function meta({ data }: Route.MetaArgs) {
  return makeMeta({
    title: `${data.action?.title ?? "Untitled"} - CrawlChat`,
  });
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "update") {
    const data = JSON.parse(formData.get("data") as string);

    const action = await prisma.apiAction.update({
      where: {
        id: params.actionId,
        scrapeId,
      },
      data: {
        scrapeId,
        userId: user!.id,
        title: data.title,
        url: data.url,
        method: data.method,
        data: data.data,
        headers: data.headers,
        description: data.description,
        type: "custom",
        requireEmailVerification: data.requireEmailVerification,
      },
    });

    return { action };
  }

  if (intent === "delete") {
    await prisma.apiAction.delete({
      where: {
        id: params.actionId,
        scrapeId,
      },
    });

    throw redirect(`/actions`);
  }
}

export default function EditAction({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher();
  const deleteFetcher = useFetcher();

  if (!loaderData.action) return;

  return (
    <EditActionProvider initAction={loaderData.action}>
      <Page
        title="Edit action"
        icon={<TbPointer />}
        right={<SaveForm fetcher={fetcher} deleteFetcher={deleteFetcher} />}
      >
        <EditForm />
      </Page>
    </EditActionProvider>
  );
}

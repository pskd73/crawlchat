import { prisma } from "~/prisma";
import type { Route } from "./+types/link-item";
import { getAuthUser } from "~/auth/middleware";
import { useEffect, useState } from "react";
import { redirect, useFetcher } from "react-router";
import { MarkdownProse } from "~/widget/markdown-prose";
import { TbBook2, TbRefresh, TbTrash } from "react-icons/tb";
import { Group, IconButton, Input, Spinner, Stack } from "@chakra-ui/react";
import { Tooltip } from "~/components/ui/tooltip";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { Page } from "~/components/page";
import { createToken } from "~/jwt";
import { toaster } from "~/components/ui/toaster";
import type { Prisma, ScrapeItem } from "libs/prisma";
import { SettingsSection } from "~/settings-section";
import { useFetcherToast } from "~/dashboard/use-fetcher-toast";

export async function loader({ params, request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const item = await prisma.scrapeItem.findUnique({
    where: { id: params.itemId },
    include: {
      knowledgeGroup: true,
    },
  });
  return { item, scrapeId };
}

export async function action({ params, request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (request.method === "DELETE") {
    const scrapeItem = await prisma.scrapeItem.findUnique({
      where: { id: params.itemId },
    });

    if (!scrapeItem) {
      return redirect("/knowledge");
    }

    const token = createToken(user!.id);
    await fetch(`${process.env.VITE_SERVER_URL}/scrape-item`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        scrapeItemId: params.itemId,
      }),
    });

    return redirect(`/knowledge/group/${scrapeItem.knowledgeGroupId}/items`);
  }

  if (intent === "refresh") {
    const scrapeItem = await prisma.scrapeItem.findUnique({
      where: { id: params.itemId },
    });

    if (!scrapeItem) {
      return redirect("/knowledge");
    }

    await prisma.knowledgeGroup.update({
      where: { id: scrapeItem.knowledgeGroupId },
      data: { status: "processing" },
    });

    const token = createToken(user!.id);
    await fetch(`${process.env.VITE_SERVER_URL}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        scrapeId: scrapeItem.scrapeId,
        url: scrapeItem.url,
        knowledgeGroupId: scrapeItem.knowledgeGroupId,
      }),
    });

    return { success: true };
  }

  if (intent === "update") {
    const update: Prisma.ScrapeItemUpdateInput = {};
    if (formData.get("title")) {
      update.title = formData.get("title") as string;
    }
    if (formData.get("url")) {
      update.url = formData.get("url") as string;
    }

    await prisma.scrapeItem.update({
      where: { id: params.itemId },
      data: update,
    });

    return { success: true };
  }
}

function NameSection({ item }: { item: ScrapeItem }) {
  const updateFetcher = useFetcher();

  useFetcherToast(updateFetcher, {
    title: "Updated",
    description: "Title updated",
  });

  return (
    <SettingsSection
      title="Title"
      description="Change the title of the item. The name will be shown under Sources section of chat widget or other channels."
      fetcher={updateFetcher}
    >
      <input type="hidden" name="intent" value="update" />
      <Input
        name="title"
        placeholder="Example: FAQ Document"
        defaultValue={item.title ?? ""}
      />
    </SettingsSection>
  );
}

function UrlSection({ item }: { item: ScrapeItem }) {
  const updateFetcher = useFetcher();

  useFetcherToast(updateFetcher, {
    title: "Updated",
    description: "Title updated",
  });

  return (
    <SettingsSection
      title="URL"
      description="Change the URL of the item. The URL will be used to fetch the item."
      fetcher={updateFetcher}
    >
      <input type="hidden" name="intent" value="update" />
      <Input
        name="url"
        placeholder="Example: https://example.com/faq"
        defaultValue={item.url ?? ""}
      />
    </SettingsSection>
  );
}

export default function ScrapeItem({ loaderData }: Route.ComponentProps) {
  const [deleteActive, setDeleteActive] = useState(false);
  const deleteFetcher = useFetcher();
  const refreshFetcher = useFetcher();

  useEffect(() => {
    if (refreshFetcher.data) {
      toaster.success({
        title: "Initiated",
        description: "This item is added to fetch queue",
      });
    }
  }, [refreshFetcher.data]);

  function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    if (!deleteActive) {
      setDeleteActive(true);
      e.preventDefault();
      e.stopPropagation();
      setTimeout(() => {
        setDeleteActive(false);
      }, 3000);
      return;
    }
  }

  const canRefresh =
    loaderData.item?.knowledgeGroup &&
    !["learn_discord", "answer_corrections", "upload"].includes(
      loaderData.item.knowledgeGroup.type
    );

  return (
    <Page
      title={loaderData.item?.title ?? "Untitled"}
      icon={<TbBook2 />}
      right={
        <Group>
          {canRefresh && (
            <refreshFetcher.Form method="post">
              <input type="hidden" name="intent" value="refresh" />
              <Tooltip content={"Refetch"} showArrow>
                <IconButton
                  variant={"subtle"}
                  type={"submit"}
                  disabled={refreshFetcher.state !== "idle"}
                >
                  <TbRefresh />
                </IconButton>
              </Tooltip>
            </refreshFetcher.Form>
          )}

          <deleteFetcher.Form method="delete">
            <Tooltip
              content={deleteActive ? "Are you sure?" : "Delete"}
              showArrow
              open={deleteActive || undefined}
            >
              <IconButton
                colorPalette={"red"}
                variant={deleteActive ? "solid" : "subtle"}
                type={deleteActive ? "submit" : "button"}
                onClick={handleDelete}
                disabled={deleteFetcher.state !== "idle"}
              >
                {deleteFetcher.state === "idle" ? <TbTrash /> : <Spinner />}
              </IconButton>
            </Tooltip>
          </deleteFetcher.Form>
        </Group>
      }
    >
      <Stack>
        <Stack maxW={"800px"}>
          {loaderData.item &&
            loaderData.item.knowledgeGroup?.type === "upload" && (
              <>
                <NameSection item={loaderData.item} />
                <UrlSection item={loaderData.item} />
              </>
            )}
          <MarkdownProse>{loaderData.item?.markdown}</MarkdownProse>
        </Stack>
      </Stack>
    </Page>
  );
}

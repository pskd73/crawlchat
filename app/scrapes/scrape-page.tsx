import { Page } from "~/components/page";
import {
  Badge,
  Box,
  DataList,
  Group,
  HStack,
  IconButton,
  Spinner,
  Stack,
  Textarea,
} from "@chakra-ui/react";
import type { Route } from "./+types/scrape-page";
import { prisma } from "~/prisma";
import { getScrapeTitle } from "./util";
import { getAuthUser } from "~/auth/middleware";
import {
  TbAlertCircle,
  TbCheck,
  TbLink,
  TbRefresh,
  TbSettings,
  TbWorld,
} from "react-icons/tb";
import moment from "moment";
import { SettingsSection } from "~/dashboard/settings";
import { Outlet, useFetcher, useNavigate } from "react-router";
import type { Prisma } from "@prisma/client";
import { SegmentedControl } from "~/components/ui/segmented-control";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { createToken } from "~/jwt";
import { toaster } from "~/components/ui/toaster";

export async function loader({ params, request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  const scrape = await prisma.scrape.findUnique({
    where: { id: params.id, userId: user!.id },
  });

  if (!scrape) {
    throw new Response("Not found", { status: 404 });
  }

  const items = await prisma.scrapeItem.findMany({
    where: { scrapeId: scrape.id },
    select: { id: true, url: true },
  });

  const tab = request.url.split(scrape.id)[1].substring(1);

  return { scrape, items, tab };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const formData = await request.formData();

  const action = formData.get("action");

  if (action === "re-crawl") {
    const token = createToken(user!.id);
    await fetch(`${process.env.VITE_SERVER_URL}/scrape`, {
      method: "POST",
      body: JSON.stringify({ scrapeId: params.id }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return { action: "re-crawl", status: "success" };
  }
}

export default function ScrapePage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const [tab, setTab] = useState<string>(loaderData.tab);
  const navigate = useNavigate();
  const recrawlFetcher = useFetcher();

  useEffect(() => {
    if (actionData?.status === "success" && actionData.action === "re-crawl") {
      toaster.success({
        title: "Success",
        description: "Initiated the crawl",
      });
    }
  }, [actionData]);

  function handleTabChange(value: string) {
    setTab(value);
    navigate(`/collections/${loaderData.scrape.id}/${value}`);
  }

  function copyUrl() {
    const url = new URL(window.location.origin);
    url.pathname = `/w/${loaderData.scrape.id}`;
    navigator.clipboard.writeText(url.toString());
    toaster.success({
      title: "Copied to clipboard",
      description: "URL copied to clipboard",
    });
  }

  return (
    <Page
      title={getScrapeTitle(loaderData.scrape)}
      icon={<TbWorld />}
      right={
        <Group>
          <IconButton variant={"subtle"} onClick={copyUrl}>
            <TbLink />
          </IconButton>
          <recrawlFetcher.Form method="post">
            <input type="hidden" name="action" value="re-crawl" />
            <Button
              variant={"subtle"}
              type="submit"
              loading={recrawlFetcher.state !== "idle"}
            >
              <TbRefresh />
              Re-crawl
            </Button>
          </recrawlFetcher.Form>
        </Group>
      }
    >
      <Stack>
        <DataList.Root orientation={"horizontal"}>
          <DataList.Item>
            <DataList.ItemLabel>Root URL</DataList.ItemLabel>
            <DataList.ItemValue>{loaderData.scrape.url}</DataList.ItemValue>
          </DataList.Item>
          <DataList.Item>
            <DataList.ItemLabel>Links scraped</DataList.ItemLabel>
            <DataList.ItemValue>
              <Badge variant={"surface"} colorPalette={"brand"}>
                <TbWorld />
                {loaderData.items.length}
              </Badge>
            </DataList.ItemValue>
          </DataList.Item>
          <DataList.Item>
            <DataList.ItemLabel>Created</DataList.ItemLabel>
            <DataList.ItemValue>
              {moment(loaderData.scrape.createdAt).fromNow()}
            </DataList.ItemValue>
          </DataList.Item>
          <DataList.Item>
            <DataList.ItemLabel>Status</DataList.ItemLabel>
            <DataList.ItemValue>
              {loaderData.scrape.status === "done" && (
                <Badge colorPalette={"brand"} variant={"surface"}>
                  <TbCheck />
                  Completed
                </Badge>
              )}
              {loaderData.scrape.status === "scraping" && (
                <Badge variant={"surface"}>
                  <Spinner size={"xs"} />
                  Scraping
                </Badge>
              )}
              {loaderData.scrape.status === "error" && (
                <Badge variant={"surface"} colorPalette={"red"}>
                  <TbAlertCircle />
                  Error
                </Badge>
              )}
            </DataList.ItemValue>
          </DataList.Item>
        </DataList.Root>

        <Box mt={6}>
          <SegmentedControl
            value={tab || "settings"}
            onValueChange={(e) => handleTabChange(e.value)}
            items={[
              {
                value: "settings",
                label: (
                  <HStack>
                    <TbSettings />
                    Settings
                  </HStack>
                ),
              },
              {
                value: "links",
                label: (
                  <HStack>
                    <TbWorld />
                    Links
                  </HStack>
                ),
              },
            ]}
          />
        </Box>

        <Stack>
          <Outlet />
        </Stack>
      </Stack>
    </Page>
  );
}

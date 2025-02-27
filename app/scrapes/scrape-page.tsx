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
  TbTrash,
  TbWorld,
  TbRobotFace,
  TbCode,
} from "react-icons/tb";
import moment from "moment";
import { Link, Outlet, redirect, useFetcher, useNavigate } from "react-router";
import { SegmentedControl } from "~/components/ui/segmented-control";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { createToken } from "~/jwt";
import { toaster } from "~/components/ui/toaster";
import { Tooltip } from "~/components/ui/tooltip";

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

  if (request.method === "DELETE") {
    await fetch(`${process.env.VITE_SERVER_URL}/scrape`, {
      method: "DELETE",
      body: JSON.stringify({ scrapeId: params.id }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${createToken(user!.id)}`,
      },
    });
    await prisma.scrape.delete({
      where: { id: params.id },
    });
    throw redirect("/collections");
  }
}

export default function ScrapePage({ loaderData }: Route.ComponentProps) {
  const [tab, setTab] = useState<string>(loaderData.tab);
  const navigate = useNavigate();
  const deleteFetcher = useFetcher();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (deleteConfirm) {
      setTimeout(() => {
        setDeleteConfirm(false);
      }, 5000);
    }
  }, [deleteConfirm]);

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

  function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    deleteFetcher.submit(null, {
      method: "delete",
    });
  }

  return (
    <Page
      title={getScrapeTitle(loaderData.scrape)}
      icon={<TbWorld />}
      right={
        <Group>
          <Tooltip
            content={deleteConfirm ? "Sure to delete?" : "Delete"}
            showArrow
            open={deleteConfirm}
          >
            <IconButton
              colorPalette={"red"}
              variant={deleteConfirm ? "solid" : "subtle"}
              onClick={handleDelete}
              disabled={deleteFetcher.state !== "idle"}
            >
              {deleteFetcher.state !== "idle" ? (
                <Spinner size="sm" />
              ) : (
                <TbTrash />
              )}
            </IconButton>
          </Tooltip>
          <IconButton variant={"subtle"} onClick={copyUrl}>
            <TbLink />
          </IconButton>

          <Button variant={"subtle"} asChild>
            <Link
              to={`/scrape?url=${loaderData.scrape.url}&collection=${loaderData.scrape.id}&links=300`}
            >
              <TbRefresh />
              Re-crawl
            </Link>
          </Button>
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
              {
                value: "mcp",
                label: (
                  <HStack>
                    <TbRobotFace />
                    MCP
                  </HStack>
                ),
              },
              {
                value: "embed",
                label: (
                  <HStack>
                    <TbCode />
                    Embed
                  </HStack>
                ),
              },
            ]}
          />
        </Box>

        <Stack mt={6}>
          <Outlet />
        </Stack>
      </Stack>
    </Page>
  );
}

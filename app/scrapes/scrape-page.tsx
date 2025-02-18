import { Page } from "~/components/page";
import { Badge, DataList, Stack, Text } from "@chakra-ui/react";
import type { Route } from "./+types/scrape-page";
import { prisma } from "~/prisma";
import { getScrapeTitle } from "./util";
import { getAuthUser } from "~/auth/middleware";
import { TbWorld } from "react-icons/tb";
import moment from "moment";

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
  return { scrape, items };
}

export default function ScrapePage({ loaderData }: Route.ComponentProps) {
  return (
    <Page title={getScrapeTitle(loaderData.scrape)} icon={<TbWorld />}>
      <Stack>
        <DataList.Root orientation={"horizontal"}>
          <DataList.Item>
            <DataList.ItemLabel>Root URL</DataList.ItemLabel>
            <DataList.ItemValue>{loaderData.scrape.url}</DataList.ItemValue>
          </DataList.Item>
          <DataList.Item>
            <DataList.ItemLabel>Links scraped</DataList.ItemLabel>
            <DataList.ItemValue>
              <Badge variant={"surface"}>{loaderData.items.length}</Badge>
            </DataList.ItemValue>
          </DataList.Item>
          <DataList.Item>
            <DataList.ItemLabel>Created</DataList.ItemLabel>
            <DataList.ItemValue>
              {moment(loaderData.scrape.createdAt).fromNow()}
            </DataList.ItemValue>
          </DataList.Item>
        </DataList.Root>
      </Stack>
    </Page>
  );
}

import {
  Badge,
  Box,
  Group,
  IconButton,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import type { Route } from "./+types/scrape-links";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "~/prisma";
import moment from "moment";
import { TbCheck, TbRefresh } from "react-icons/tb";
import { Tooltip } from "~/components/ui/tooltip";
import type { ScrapeItem } from "@prisma/client";
import { useFetcher } from "react-router";
import { createToken } from "~/jwt";

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
    select: { id: true, url: true, title: true, createdAt: true },
  });

  return { scrape, items };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getAuthUser(request);

  const formData = await request.formData();
  const url = formData.get("url");

  const token = createToken(user!.id);

  await fetch(`${process.env.VITE_SERVER_URL}/scrape`, {
    method: "POST",
    body: JSON.stringify({ url, scrapeId: params.id }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

function LinkRefresh({ url }: { url: string }) {
  const fetcher = useFetcher();

  return (
    <Tooltip
      content="Refresh content"
      positioning={{ placement: "top" }}
      showArrow
    >
      <fetcher.Form method="post">
        <input type="hidden" name="url" value={url} />
        <Box
          opacity={fetcher.state === "idle" ? 0 : 1}
          _groupHover={{ opacity: 1 }}
          color="brand.fg"
          cursor={"pointer"}
          asChild
        >
          <button type="submit" disabled={fetcher.state !== "idle"}>
            {fetcher.state !== "idle" ? <Spinner size="xs" /> : <TbRefresh />}
          </button>
        </Box>
      </fetcher.Form>
    </Tooltip>
  );
}

export default function ScrapeLinks({ loaderData }: Route.ComponentProps) {
  return (
    <Stack>
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Url</Table.ColumnHeader>
            <Table.ColumnHeader>Title</Table.ColumnHeader>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
            <Table.ColumnHeader>Created</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {loaderData.items.map((item) => (
            <Table.Row key={item.id}>
              <Table.Cell className="group">
                <Group>
                  <Text>{new URL(item.url).pathname}</Text>
                  <LinkRefresh url={item.url} />
                </Group>
              </Table.Cell>
              <Table.Cell>{item.title}</Table.Cell>
              <Table.Cell>
                <Badge variant={"surface"} colorPalette={"brand"}>
                  <TbCheck />
                  Success
                </Badge>
              </Table.Cell>
              <Table.Cell>{moment(item.createdAt).fromNow()}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Stack>
  );
}

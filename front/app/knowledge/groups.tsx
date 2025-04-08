import {
  Badge,
  Group,
  Link as ChakraLink,
  Stack,
  Table,
  Text,
  Center,
  Progress,
} from "@chakra-ui/react";
import type { Route } from "./+types/groups";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "~/prisma";
import moment from "moment";
import {
  TbBook,
  TbBrandDiscord,
  TbBrandGithub,
  TbPlus,
  TbWorld,
} from "react-icons/tb";
import { Link } from "react-router";
import { getSessionScrapeId } from "~/scrapes/util";
import { Page } from "~/components/page";
import { Button } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/empty-state";
import { useMemo } from "react";
import { GroupStatus } from "./group/status";
import { ActionButton } from "./group/action-button";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  const scrapeId = await getSessionScrapeId(request);

  const scrape = await prisma.scrape.findUnique({
    where: { id: scrapeId, userId: user!.id },
  });

  if (!scrape) {
    throw new Response("Not found", { status: 404 });
  }

  const knowledgeGroups = await prisma.knowledgeGroup.findMany({
    where: { scrapeId: scrape.id, userId: user!.id },
    orderBy: { createdAt: "desc" },
  });

  const counts: Record<string, number> = {};
  for (const group of knowledgeGroups) {
    counts[group.id] = await prisma.scrapeItem.count({
      where: { knowledgeGroupId: group.id },
    });
  }

  const ONE_WEEK_AGO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const citationCounts: Record<string, number> = {};
  for (const group of knowledgeGroups) {
    const messages = await prisma.message.findMany({
      where: {
        scrapeId,
        links: { some: { knowledgeGroupId: group.id } },
        createdAt: { gte: ONE_WEEK_AGO },
      },
      select: {
        links: {
          select: {
            knowledgeGroupId: true,
          },
        },
      },
    });
    const links = messages
      .flatMap((m) => m.links)
      .filter((l) => l.knowledgeGroupId === group.id);
    citationCounts[group.id] = links.length;
  }

  return { scrape, knowledgeGroups, counts, citationCounts };
}

export default function KnowledgeGroups({ loaderData }: Route.ComponentProps) {
  const groups = useMemo(() => {
    return loaderData.knowledgeGroups.map((group) => {
      let icon = <TbBook />;
      let typeText = "Unknown";

      if (group.type === "scrape_web") {
        icon = <TbWorld />;
        typeText = "Web";
      } else if (group.type === "scrape_github") {
        icon = <TbBrandGithub />;
        typeText = "GitHub";
      } else if (group.type === "learn_discord") {
        icon = <TbBrandDiscord />;
        typeText = "Discord";
      }

      const totalCited = Object.values(loaderData.citationCounts).reduce(
        (acc, count) => acc + count,
        0
      );

      return {
        icon,
        typeText,
        group,
        citationPct:
          totalCited > 0
            ? (loaderData.citationCounts[group.id] / totalCited) * 100
            : 0,
        totalCited,
        citedNum: loaderData.citationCounts[group.id],
      };
    });
  }, [loaderData.knowledgeGroups]);

  return (
    <Page
      title="Knowledge"
      icon={<TbBook />}
      right={
        <Group>
          <Button variant={"subtle"} colorPalette={"brand"} asChild>
            <Link to="/knowledge/group">
              <TbPlus />
              Add group
            </Link>
          </Button>
        </Group>
      }
    >
      {groups.length === 0 && (
        <Center w="full" h="full">
          <EmptyState
            title="No knowledge groups"
            description="Create a new knowledge group to get started."
          >
            <Button asChild colorPalette={"brand"}>
              <Link to="/knowledge/group">
                <TbPlus />
                Create a group
              </Link>
            </Button>
          </EmptyState>
        </Center>
      )}
      {groups.length > 0 && (
        <Stack>
          <Table.Root size="lg">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader w="12%">Type</Table.ColumnHeader>
                <Table.ColumnHeader>Title</Table.ColumnHeader>
                <Table.ColumnHeader w="18%">Citations</Table.ColumnHeader>
                <Table.ColumnHeader w="10%"># Items</Table.ColumnHeader>
                <Table.ColumnHeader w="10%">Status</Table.ColumnHeader>
                <Table.ColumnHeader w="16%">Updated</Table.ColumnHeader>
                <Table.ColumnHeader w="10%">Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {groups.map((item) => (
                <Table.Row key={item.group.id}>
                  <Table.Cell className="group">
                    <Group>
                      <Text fontSize={"xl"}>{item.icon}</Text>
                      <Text>{item.typeText}</Text>
                    </Group>
                  </Table.Cell>
                  <Table.Cell>
                    <ChakraLink
                      asChild
                      variant={"underline"}
                      _hover={{
                        color: "brand.fg",
                      }}
                    >
                      <Link to={`/knowledge/group/${item.group.id}`}>
                        {item.group.title ?? "Untitled"}
                      </Link>
                    </ChakraLink>
                  </Table.Cell>
                  <Table.Cell>
                    <Group w="full">
                      <Text fontSize={"xs"}>
                        {item.citedNum} / {item.totalCited}
                      </Text>
                      <Progress.Root
                        w="100px"
                        value={item.citationPct}
                        min={0}
                        max={100}
                      >
                        <Progress.Track>
                          <Progress.Range />
                        </Progress.Track>
                      </Progress.Root>
                    </Group>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant={"subtle"}>
                      {loaderData.counts[item.group.id] ?? 0}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <GroupStatus status={item.group.status} />
                  </Table.Cell>
                  <Table.Cell>
                    {moment(item.group.updatedAt).fromNow()}
                  </Table.Cell>
                  <Table.Cell>
                    <Group>
                      {["scrape_web", "scrape_github"].includes(
                        item.group.type
                      ) && <ActionButton group={item.group} />}
                    </Group>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Stack>
      )}
    </Page>
  );
}

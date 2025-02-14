import { GridItem, SimpleGrid } from "@chakra-ui/react";
import { Stack } from "@chakra-ui/react";
import { TbFolder } from "react-icons/tb";
import { Page } from "~/components/page";
import type { Route } from "./+types/page";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "~/prisma";
import { ScrapeCard } from "./card";
import { useFetcher } from "react-router";
import { createToken } from "~/jwt";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapes = await prisma.scrape.findMany({
    where: {
      userId: user?.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return {
    user,
    scrapes,
  };
}

export async function action({ request }: { request: Request }) {
  const user = await getAuthUser(request);
  const formData = await request.formData();

  if (request.method === "DELETE") {
    await fetch(`${process.env.VITE_SERVER_URL}/scrape`, {
      method: "DELETE",
      body: JSON.stringify({ scrapeId: formData.get("id") }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${createToken(user!.id)}`,
      },
    });
    const id = formData.get("id");
    await prisma.scrape.delete({
      where: { id: id as string },
    });
    return null;
  }
}

export default function ScrapesPage({ loaderData }: Route.ComponentProps) {
  const deleteFetcher = useFetcher();

  function handleDelete(id: string) {
    deleteFetcher.submit({ id }, { method: "delete" });
  }

  return (
    <Page title="Collections" icon={<TbFolder />}>
      <Stack maxW={"1000px"}>
        <SimpleGrid columns={5} gap={4}>
          {loaderData.scrapes.slice(0, 4).map((scrape) => (
            <GridItem key={scrape.id}>
              <ScrapeCard
                scrape={scrape}
                onDelete={() => handleDelete(scrape.id)}
                deleting={deleteFetcher.state !== "idle"}
              />
            </GridItem>
          ))}
        </SimpleGrid>
      </Stack>
    </Page>
  );
}

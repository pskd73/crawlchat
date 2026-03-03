import cn from "@meltdownjs/cn";
import type { Article } from "@packages/common/prisma";
import { prisma } from "@packages/common/prisma";
import { useContext } from "react";
import { TbBook2 } from "react-icons/tb";
import { sanitizeScrape } from "~/sanitize";
import type { Route } from "./+types/page";
import { HelpdeskContext } from "./context";
import { Container } from "./layout";

export async function loader({ params }: Route.LoaderArgs) {
  const scrape = await prisma.scrape.findFirstOrThrow({
    where: {
      slug: params.slug,
    },
  });

  const guides = await prisma.article.findMany({
    where: {
      scrapeId: scrape.id,
      purpose: "guide",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  sanitizeScrape(scrape);

  return { guides, scrape };
}

function GuidesGrid({ guides, slug }: { guides: Article[]; slug: string }) {
  const { chatActive } = useContext(HelpdeskContext);

  if (chatActive || guides.length === 0) {
    return null;
  }

  return (
    <Container className="w-full">
      <h2 className="text-xl font-medium mb-4">Recent Guides</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {guides.map((guide) => (
          <a
            key={guide.id}
            href={`/helpdesk/${slug}/article/${guide.id}`}
            className={cn(
              "flex flex-col gap-2 border border-base-300 rounded-box p-4",
              "bg-base-100 shadow-sm hover:shadow-md transition-all",
              "hover:bg-base-200 cursor-pointer"
            )}
          >
            <div className="flex items-center gap-2">
              <TbBook2 className="text-primary shrink-0" />
              <h3 className="font-medium line-clamp-1">
                {guide.title || "Untitled Guide"}
              </h3>
            </div>
          </a>
        ))}
      </div>
    </Container>
  );
}

export default function Page({ loaderData }: Route.ComponentProps) {
  return (
    <GuidesGrid guides={loaderData.guides} slug={loaderData.scrape.slug!} />
  );
}

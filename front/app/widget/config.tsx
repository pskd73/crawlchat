import { prisma } from "@packages/common/prisma";
import { NO_INDEX_HTTP_HEADERS } from "~/meta";
import type { Route } from "./+types/config";

export function headers() {
  return NO_INDEX_HTTP_HEADERS;
}

export async function loader({ params }: Route.LoaderArgs) {
  const { id } = params;

  const scrape = await prisma.scrape.findUnique({
    where: {
      id,
    },
  });

  if (!scrape) {
    return Response.json(
      {
        success: "error",
        message: "Not found",
      },
      { status: 404 }
    );
  }

  return Response.json({
    success: "ok",
    id: scrape.id,
    widgetConfig: {
      ...scrape.widgetConfig,
      logoUrl: scrape.logoUrl,
    },
  });
}

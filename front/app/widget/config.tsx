import { prisma } from "libs/prisma";
import type { Route } from "./+types/config";

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

import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser } from "~/auth/scrape-session";
import { getSession } from "~/session";
import type { Route } from "./+types/api";
import { getSetupProgressInput } from "./make";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request, { redirectTo: "/login" });

  const session = await getSession(request.headers.get("cookie"));
  const scrapeId = session.get("scrapeId");
  authoriseScrapeUser(user!.scrapeUsers!, scrapeId!);

  return {
    input: await getSetupProgressInput(user!.id, scrapeId!),
  };
}

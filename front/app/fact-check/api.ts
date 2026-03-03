import { createToken } from "@packages/common/jwt";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import type { Route } from "./+types/api";

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "check-fact") {
    const fact = formData.get("fact") as string;

    const token = createToken(user!.id);
    const response = await fetch(
      `${process.env.VITE_SERVER_URL}/fact-check/${scrapeId}`,
      {
        method: "POST",
        body: JSON.stringify({ fact }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || "Failed to check fact", fact, score: 0 };
    }

    return Response.json(await response.json());
  }

  return {};
}

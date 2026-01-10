import { Outlet, redirect } from "react-router";
import { CTA, Footer, LandingPage, Nav } from "./page";
import { getAuthUser } from "~/auth/middleware";
import type { Route } from "./+types/layout";

let githubStars = 0;
let githubStarsUpdatedAt = 0;
const MINS_5 = 5 * 60 * 1000;

async function getGithubStars() {
  if (githubStarsUpdatedAt < Date.now() - MINS_5) {
    try {
      const result = await fetch(
        "https://api.github.com/repos/crawlchat/crawlchat"
      );
      const json = await result.json();
      githubStars = json.stargazers_count;
      githubStarsUpdatedAt = Date.now();
    } catch (error) {
      console.warn("Failed to get GitHub stars", error);
    }
  }
  return githubStars;
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request, { dontRedirect: true });

  if (process.env.SELF_HOSTED) {
    return redirect("/login");
  }

  return {
    user,
    githubStars: await getGithubStars(),
  };
}

export default function LandingLayout({ loaderData }: Route.ComponentProps) {
  return (
    <LandingPage>
      <Nav user={loaderData.user} githubStars={loaderData.githubStars} />

      <Outlet />

      <CTA />

      <Footer />
    </LandingPage>
  );
}

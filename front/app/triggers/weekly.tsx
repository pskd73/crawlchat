import { sendWeeklyForAllUsers } from "~/alerts/weekly";
import { getAuthUser } from "~/auth/middleware";
import type { Route } from "./+types/weekly";
import { redirect } from "react-router";

let startedAt: Date | null = null;

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  if (user?.email !== "pramodkumar.damam73@gmail.com") {
    return redirect("/");
  }
  if (startedAt) {
    return { status: "already-running", startedAt };
  }
  startedAt = new Date();
  sendWeeklyForAllUsers().then(() => {
    startedAt = null;
  });
  return { status: "started", startedAt };
}

export default function Weekly({ loaderData }: Route.ComponentProps) {
  return <div>{JSON.stringify(loaderData)}</div>;
}

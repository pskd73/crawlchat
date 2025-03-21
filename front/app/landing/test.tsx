import { name } from "libs";
import type { Route } from "./+types/test";
import { sendWeeklyForAllUsers, sendWeeklyForUser } from "~/alerts/weekly";

export async function loader() {
  await sendWeeklyForAllUsers();
  return {
    name: name(),
  };
}

export default function Test({ loaderData }: Route.ComponentProps) {
  return <div>{loaderData.name}</div>;
}

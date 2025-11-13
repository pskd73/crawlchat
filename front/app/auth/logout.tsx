import { redirect, type LoaderFunctionArgs } from "react-router";
import { destroySession, getSession } from "~/session";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("cookie"));
  return redirect("/login", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}

export default function LogoutPage() {
  return (
    <div className="flex items-center justify-center w-screen h-screen">
      <span className="loading loading-spinner loading-lg" />
    </div>
  );
}

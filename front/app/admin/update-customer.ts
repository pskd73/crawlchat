import { redirect } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { getDodoClient } from "~/payment/gateway-dodo";
import type { Route } from "./+types/update-customer";
import { adminEmails } from "./emails";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  if (!adminEmails.includes(user!.email)) {
    throw redirect("/app");
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const newName = url.searchParams.get("newName");

  if (!email || !newName) {
    return new Response(
      JSON.stringify({
        error: "email and newName query parameters are required",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const client = getDodoClient();
  const customerList = await client.customers.list({
    email,
  });

  if (!customerList.items || customerList.items.length === 0) {
    return new Response(JSON.stringify({ error: "Customer not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const customer = customerList.items[0];
  const updatedCustomer = await client.customers.update(customer.customer_id, {
    name: newName,
  });

  return new Response(JSON.stringify(updatedCustomer), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

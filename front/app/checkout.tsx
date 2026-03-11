import { redirect } from "react-router";
import type { Route } from "./+types/checkout";
import { getAuthUser } from "./auth/middleware";
import { dodoGateway } from "./payment/gateway-dodo";

export async function loader({ request, params }: Route.LoaderArgs) {
  const productId = params.productId;

  const user = await getAuthUser(request, { dontRedirect: true });

  const checkout = await dodoGateway.getPaymentLink(productId, user?.email);

  return redirect(checkout.url);
}

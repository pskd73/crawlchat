import type { Route } from "./+types/lemonsqueezy-webhook";
import { dodoGateway } from "./gateway-dodo";
import { handleWebhook } from "./webhook-handler";

export async function action({ request }: Route.ActionArgs) {
  return handleWebhook(request, dodoGateway);
}

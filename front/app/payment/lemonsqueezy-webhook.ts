import type { Route } from "./+types/lemonsqueezy-webhook";
import { lemonsqueezyGateway } from "./gateway-lemonsqueezy";
import { handleWebhook } from "./webhook-handler";

export async function action({ request }: Route.ActionArgs) {
  return handleWebhook(request, lemonsqueezyGateway);
}

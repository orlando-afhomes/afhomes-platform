import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { getPaymentView } from "@/server/services/views";

export const GET = route({ write: false, template: "GET /payments/{id}" }, async ({ actor, params }) => ({
  body: { payment: await getPaymentView(actor, pathId(params.id, "Payment")) },
}));

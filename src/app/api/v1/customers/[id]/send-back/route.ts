import { route } from "@/server/api/route";
import { CustomerReviewBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { sendBackCustomer } from "@/server/services/customers";

export const POST = route({ write: true, template: "POST /customers/{id}/send-back" }, async ({ actor, params, body }) => ({
  body: { customer: await sendBackCustomer(actor, pathId(params.id, "Customer"), parse(CustomerReviewBody, body).reason) },
}));

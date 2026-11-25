import { route } from "@/server/api/route";
import { CustomerReviewBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { rejectCustomer } from "@/server/services/customers";

export const POST = route({ write: true, template: "POST /customers/{id}/reject" }, async ({ actor, params, body }) => ({
  body: { customer: await rejectCustomer(actor, pathId(params.id, "Customer"), parse(CustomerReviewBody, body).reason) },
}));

import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { approveCustomer } from "@/server/services/customers";

export const POST = route({ write: true, template: "POST /customers/{id}/approve" }, async ({ actor, params }) => ({
  body: { customer: await approveCustomer(actor, pathId(params.id, "Customer")) },
}));

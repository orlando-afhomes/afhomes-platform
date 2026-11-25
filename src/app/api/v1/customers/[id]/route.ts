import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { getCustomerView } from "@/server/services/views";

export const GET = route({ write: false, template: "GET /customers/{id}" }, async ({ actor, params }) => ({
  body: { customer: await getCustomerView(actor, pathId(params.id, "Customer")) },
}));

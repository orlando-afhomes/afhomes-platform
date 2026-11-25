import { route } from "@/server/api/route";
import { CustomerBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { getCustomerView } from "@/server/services/views";
import { updateCustomerDraft } from "@/server/services/customers";

export const GET = route({ write: false, template: "GET /customers/{id}" }, async ({ actor, params }) => ({
  body: { customer: await getCustomerView(actor, pathId(params.id, "Customer")) },
}));

export const POST = route({ write: true, template: "POST /customers/{id}" }, async ({ actor, params, body }) => ({
  body: { customer: await updateCustomerDraft(actor, pathId(params.id, "Customer"), parse(CustomerBody, body)) },
}));

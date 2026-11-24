import { route } from "@/server/api/route";
import { CustomerBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { submitCustomer } from "@/server/services/customers";

export const POST = route({ write: true, template: "POST /customers/{id}/submit" }, async ({ actor, params, body }) => ({
  body: { customer: await submitCustomer(actor, pathId(params.id, "Customer"), parse(CustomerBody, body ?? {})) },
}));

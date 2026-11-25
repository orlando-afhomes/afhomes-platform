import { route } from "@/server/api/route";
import { CustomerCorrectBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { correctCustomer } from "@/server/services/customers";

export const POST = route({ write: true, template: "POST /customers/{id}/correct" }, async ({ actor, params, body }) => {
  const { reason, ...input } = parse(CustomerCorrectBody, body);
  return { body: { customer: await correctCustomer(actor, pathId(params.id, "Customer"), input, reason) } };
});

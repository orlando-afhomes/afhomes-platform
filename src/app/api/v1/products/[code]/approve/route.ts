import { route } from "@/server/api/route";
import { ReasonBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { approveProduct } from "@/server/services/catalog-admin";

export const POST = route({ write: true, template: "POST /products/{code}/approve" }, async ({ actor, params, body }) => {
  const { reason } = parse(ReasonBody, body);
  return { body: { product: await approveProduct(actor, params.code, reason) } };
});

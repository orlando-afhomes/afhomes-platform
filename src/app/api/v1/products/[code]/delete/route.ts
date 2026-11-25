import { route } from "@/server/api/route";
import { ReasonBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { deleteProduct } from "@/server/services/catalog-admin";

export const POST = route({ write: true, template: "POST /products/{code}/delete" }, async ({ actor, params, body }) => {
  const { reason } = parse(ReasonBody, body);
  await deleteProduct(actor, params.code, reason);
  return { body: { ok: true } };
});

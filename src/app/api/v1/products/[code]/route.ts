import { route } from "@/server/api/route";
import { ProductPatch } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { updateProduct } from "@/server/services/catalog-admin";
import { z } from "zod";

const UpdateProductBody = z.strictObject({ input: ProductPatch, reason: z.string().min(1).max(500) });

export const POST = route({ write: true, template: "POST /products/{code}" }, async ({ actor, params, body }) => {
  const parsed = parse(UpdateProductBody, body);
  return { body: { product: await updateProduct(actor, params.code, parsed.input, parsed.reason) } };
});

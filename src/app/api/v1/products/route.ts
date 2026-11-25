import { route } from "@/server/api/route";
import { ProductBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { createProduct } from "@/server/services/catalog-admin";
import { z } from "zod";
import { listProducts } from "@/server/services/views";

export const GET = route({ write: false, template: "GET /products" }, async () => ({ body: { items: await listProducts() } }));

const CreateProductBody = z.strictObject({ input: ProductBody, reason: z.string().min(1).max(500) });

export const POST = route({ write: true, template: "POST /products" }, async ({ actor, body }) => {
  const parsed = parse(CreateProductBody, body);
  return { status: 201, body: { product: await createProduct(actor, parsed.input, parsed.reason) } };
});

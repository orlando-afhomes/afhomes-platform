import { route } from "@/server/api/route";
import { PaymentSchemePatch } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { updateScheme } from "@/server/services/catalog-admin";
import { z } from "zod";

const UpdateSchemeBody = z.strictObject({ input: PaymentSchemePatch, reason: z.string().min(1).max(500) });

export const POST = route({ write: true, template: "POST /payment-schemes/{id}" }, async ({ actor, params, body }) => {
  const parsed = parse(UpdateSchemeBody, body);
  return { body: { scheme: await updateScheme(actor, params.id, parsed.input, parsed.reason) } };
});

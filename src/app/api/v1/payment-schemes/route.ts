import { route } from "@/server/api/route";
import { PaymentSchemeBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { createScheme } from "@/server/services/catalog-admin";
import { listPaymentSchemes } from "@/server/services/views";

export const GET = route({ write: false, template: "GET /payment-schemes" }, async () => ({ body: { items: await listPaymentSchemes() } }));

export const POST = route({ write: true, template: "POST /payment-schemes" }, async ({ actor, body }) => {
  const input = parse(PaymentSchemeBody, body);
  return { status: 201, body: { scheme: await createScheme(actor, input) } };
});

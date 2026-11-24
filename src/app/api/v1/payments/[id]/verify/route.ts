import { route } from "@/server/api/route";
import { VerifyPaymentBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { verifyPayment } from "@/server/services/payments";

export const POST = route({ write: true, template: "POST /payments/{id}/verify" }, async ({ actor, params, body }) => {
  const { payment, saleStatus } = await verifyPayment(actor, pathId(params.id, "Payment"), parse(VerifyPaymentBody, body));
  return { body: { payment, saleStatus } };
});

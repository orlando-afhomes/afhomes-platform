import { route } from "@/server/api/route";
import { SubmitPaymentBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { submitPayment } from "@/server/services/payments";

export const POST = route({ write: true, template: "POST /payments" }, async ({ actor, body }) => ({
  status: 201,
  body: { payment: await submitPayment(actor, parse(SubmitPaymentBody, body)) },
}));

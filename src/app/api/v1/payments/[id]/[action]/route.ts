import type { SubmitPaymentInput } from "@/data/contracts/payment-repository";
import { route } from "@/server/api/route";
import { ApiError } from "@/server/api/errors";
import { PaymentAdjustBody, PaymentResubmitBody, ReasonBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { adjustPayment, rejectPayment, resubmitPayment, returnPayment } from "@/server/services/payments";

/** Receipt decisions (F5). Verification keeps its own endpoint. */
export const POST = route({ write: true, template: "POST /payments/{id}/{action}" }, async ({ actor, params, body }) => {
  const id = pathId(params.id, "Payment");
  switch (params.action) {
    case "reject":
      return { body: { payment: await rejectPayment(actor, id, parse(ReasonBody, body).reason) } };
    case "return":
      return { body: { payment: await returnPayment(actor, id, parse(ReasonBody, body).reason) } };
    case "resubmit":
      return { body: { payment: await resubmitPayment(actor, id, parse(PaymentResubmitBody, body ?? {}) as unknown as Partial<Omit<SubmitPaymentInput, "contractId">>) } };
    case "adjust": {
      const input = parse(PaymentAdjustBody, body);
      return { body: { payment: await adjustPayment(actor, id, input) } };
    }
    default:
      throw new ApiError(404, "unknown_action", "Unknown payment action.");
  }
});

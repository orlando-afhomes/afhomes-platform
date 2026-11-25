import type { PaymentPurpose } from "@/modules/finance/types";
import { route } from "@/server/api/route";
import { MatchUnmatchedBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { matchUnmatchedReceipt } from "@/server/services/payments";

export const POST = route({ write: true, template: "POST /unmatched-receipts/{id}/match" }, async ({ actor, params, body }) => {
  const input = parse(MatchUnmatchedBody, body) as { contractId: string; purpose: PaymentPurpose; note?: string | null };
  return { body: { payment: await matchUnmatchedReceipt(actor, pathId(params.id, "Unmatched receipt"), input) } };
});

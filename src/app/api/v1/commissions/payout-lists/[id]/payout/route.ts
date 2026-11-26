import { route } from "@/server/api/route";
import { CommissionPayoutBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { recordBulkPayout } from "@/server/services/commissions";

/** Doc 08 §11.6: record the payout for every ready commission on the list with one instruction; failures are skipped and reported. */
export const POST = route({ write: true, template: "POST /commissions/payout-lists/{id}/payout" }, async ({ actor, params, body }) => ({
  body: await recordBulkPayout(actor, pathId(params.id, "Payout list"), parse(CommissionPayoutBody, body)),
}));

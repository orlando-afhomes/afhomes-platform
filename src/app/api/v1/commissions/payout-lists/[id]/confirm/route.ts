import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { confirmBulkPayout } from "@/server/services/commissions";

/** Doc 08 §11.6: confirm the recorded disbursements at once; a held commission is never confirmed in bulk. */
export const POST = route({ write: true, template: "POST /commissions/payout-lists/{id}/confirm" }, async ({ actor, params }) => ({
  body: await confirmBulkPayout(actor, pathId(params.id, "Payout list")),
}));

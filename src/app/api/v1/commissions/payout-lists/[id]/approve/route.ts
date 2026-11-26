import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { approvePayoutList } from "@/server/services/commissions";

export const POST = route({ write: true, template: "POST /commissions/payout-lists/{id}/approve" }, async ({ actor, params }) => ({
  body: { list: await approvePayoutList(actor, pathId(params.id, "Payout list")) },
}));

import { route } from "@/server/api/route";
import { ReasonBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { rejectUnmatchedReceipt } from "@/server/services/payments";

export const POST = route({ write: true, template: "POST /unmatched-receipts/{id}/reject" }, async ({ actor, params, body }) => ({
  body: { receipt: await rejectUnmatchedReceipt(actor, pathId(params.id, "Unmatched receipt"), parse(ReasonBody, body).reason) },
}));

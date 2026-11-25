import { route } from "@/server/api/route";
import { ReasonBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { rejectReceiptImportBatch } from "@/server/services/payments";

export const POST = route({ write: true, template: "POST /history-import/{id}/reject" }, async ({ actor, params, body }) => ({
  body: { batch: await rejectReceiptImportBatch(actor, pathId(params.id, "Import batch"), parse(ReasonBody, body).reason) },
}));

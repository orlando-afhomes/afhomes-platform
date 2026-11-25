import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { signOffReceiptImportBatch } from "@/server/services/payments";

export const POST = route({ write: true, template: "POST /history-import/{id}/sign-off" }, async ({ actor, params }) => ({
  body: { batch: await signOffReceiptImportBatch(actor, pathId(params.id, "Import batch")) },
}));

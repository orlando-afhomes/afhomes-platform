import { route } from "@/server/api/route";
import { ReceiptImportCreateBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { createReceiptImportBatch, listReceiptImportBatches } from "@/server/services/payments";

export const GET = route({ write: false, template: "GET /history-import" }, async ({ actor }) => ({ body: { items: await listReceiptImportBatches(actor) } }));

export const POST = route({ write: true, template: "POST /history-import" }, async ({ actor, body }) => ({
  status: 201,
  body: { batch: await createReceiptImportBatch(actor, parse(ReceiptImportCreateBody, body)) },
}));

import type { SubmitUnmatchedReceiptInput } from "@/modules/finance/types";
import { route } from "@/server/api/route";
import { UnmatchedReceiptBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { listUnmatchedReceipts, submitUnmatchedReceipt } from "@/server/services/payments";

export const GET = route({ write: false, template: "GET /unmatched-receipts" }, async ({ actor }) => ({ body: { items: await listUnmatchedReceipts(actor) } }));

export const POST = route({ write: true, template: "POST /unmatched-receipts" }, async ({ actor, body }) => ({
  status: 201,
  body: { receipt: await submitUnmatchedReceipt(actor, parse(UnmatchedReceiptBody, body) as unknown as SubmitUnmatchedReceiptInput) },
}));

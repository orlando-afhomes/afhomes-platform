import { route } from "@/server/api/route";
import { ReconciliationRecordBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import type { ReconciliationDecisionInput } from "@/modules/reconciliation/rules";
import { listEntries, recordReconciliation } from "@/server/services/reconciliation";

/** Append-only reconciliation decisions, oldest first (doc 11 section 26; F11.3). */
export const GET = route({ write: false, template: "GET /reconciliation/entries" }, async ({ actor }) => ({
  body: { items: await listEntries(actor) },
}));

/** Records a sign-off or an explained variance against the live total. Audited. */
export const POST = route({ write: true, template: "POST /reconciliation/entries" }, async ({ actor, body }) => ({
  status: 201,
  body: { entry: await recordReconciliation(actor, parse(ReconciliationRecordBody, body) as ReconciliationDecisionInput) },
}));

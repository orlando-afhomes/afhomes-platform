import { route } from "@/server/api/route";
import { ReconciliationPeriodQuery } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { sourceTotals } from "@/server/services/reconciliation";

/** Live source totals for one month, with the records behind them (doc 11 section 26). */
export const GET = route({ write: false, template: "GET /reconciliation/totals" }, async ({ actor, request }) => {
  const { period } = parse(ReconciliationPeriodQuery, Object.fromEntries(request.nextUrl.searchParams));
  return { body: { items: await sourceTotals(actor, period) } };
});

import { route } from "@/server/api/route";
import { ReconciliationMonthQuery } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { monthSwitchStatus, recordMonthSwitch } from "@/server/services/reconciliation";

/** Differences blocking the parallel-run switch for a month (doc 08 section 16; F11.5). */
export const GET = route({ write: false, template: "GET /reconciliation/switch" }, async ({ actor, request }) => {
  const { month } = parse(ReconciliationMonthQuery, Object.fromEntries(request.nextUrl.searchParams));
  return { body: await monthSwitchStatus(actor, month) };
});

/** Super Administrator only: signs off the switch after a month closes with no unexplained differences. Audited. */
export const POST = route({ write: true, template: "POST /reconciliation/switch" }, async ({ actor, body }) => {
  const { month } = parse(ReconciliationMonthQuery, body);
  return { body: { signOff: await recordMonthSwitch(actor, month) } };
});

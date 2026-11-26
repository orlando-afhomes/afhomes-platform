import { route } from "@/server/api/route";
import { AssembleQuery } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { assembleAllowanceInputs } from "@/server/services/commissions";

/** Read-only assembly of the month's BA/PA/PB inputs from business data (doc 08 section 15; F8.6). */
export const GET = route({ write: false, template: "GET /commissions/allowances/assemble" }, async ({ actor, request }) => {
  const query = parse(AssembleQuery, Object.fromEntries(request.nextUrl.searchParams));
  return { body: await assembleAllowanceInputs(actor, query.month) };
});

import { route } from "@/server/api/route";
import { ClawbackAddendumBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { setClawbackAddendum } from "@/server/services/commissions";

export const POST = route({ write: true, template: "POST /commissions/addendum" }, async ({ actor, body }) => {
  const input = parse(ClawbackAddendumBody, body);
  await setClawbackAddendum(actor, input.memberId, input.signedDate);
  return { status: 201, body: { ok: true } };
});

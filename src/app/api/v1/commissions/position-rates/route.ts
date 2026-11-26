import { route } from "@/server/api/route";
import { VipPositionRateBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { setPositionRate } from "@/server/services/commissions";

export const POST = route({ write: true, template: "POST /commissions/position-rates" }, async ({ actor, body }) => {
  await setPositionRate(actor, parse(VipPositionRateBody, body));
  return { status: 201, body: { ok: true } };
});

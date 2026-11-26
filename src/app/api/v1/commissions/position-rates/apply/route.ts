import { route } from "@/server/api/route";
import { ApplyVipPositionRateBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { applyPositionRate } from "@/server/services/commissions";

export const POST = route({ write: true, template: "POST /commissions/position-rates/apply" }, async ({ actor, body }) => {
  await applyPositionRate(actor, parse(ApplyVipPositionRateBody, body));
  return { status: 201, body: { ok: true } };
});

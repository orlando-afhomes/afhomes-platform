import { route } from "@/server/api/route";
import { CommissionRateBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { rateDirectory, setRate } from "@/server/services/commissions";

export const GET = route({ write: false, template: "GET /commissions/rates" }, async ({ actor }) => ({ body: await rateDirectory(actor) }));

export const POST = route({ write: true, template: "POST /commissions/rates" }, async ({ actor, body }) => {
  await setRate(actor, parse(CommissionRateBody, body));
  return { status: 201, body: { ok: true } };
});

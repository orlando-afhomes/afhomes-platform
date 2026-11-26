import { route } from "@/server/api/route";
import type { StayPointsAction } from "@/data/contracts/stay-points-repository";
import { StayPointsActionBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { act } from "@/server/services/stay-points";

/** Resort bill entry, approval, refund and Compassionate Waiver actions (doc 09 §11–14). */
export const POST = route({ write: true, template: "POST /stay-points/act" }, async ({ actor, body }) => ({
  body: await act(actor, parse(StayPointsActionBody, body) as StayPointsAction),
}));

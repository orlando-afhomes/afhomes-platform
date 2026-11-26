import { route } from "@/server/api/route";
import { ApiError } from "@/server/api/errors";
import { CommissionAdjustBody, CommissionHoldBody, CommissionPayoutBody, ReasonBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { adjust, cancel, confirmPayout, recordPayout, resolveHold, voidPayout } from "@/server/services/commissions";

/** Finance decisions on one commission: rate adjust, hold resolution, cancel and the payout steps. */
export const POST = route({ write: true, template: "POST /commissions/{id}/{action}" }, async ({ actor, params, body }) => {
  const id = pathId(params.id, "Commission");
  switch (params.action) {
    case "adjust": {
      const input = parse(CommissionAdjustBody, body);
      return { body: { commission: await adjust(actor, id, input.percentBp, input.reason) } };
    }
    case "resolve-hold": {
      const input = parse(CommissionHoldBody, body);
      return { body: { commission: await resolveHold(actor, id, input.action, input.reason) } };
    }
    case "cancel":
      return { body: { commission: await cancel(actor, id, parse(ReasonBody, body).reason) } };
    case "payout":
      return { body: { commission: await recordPayout(actor, id, parse(CommissionPayoutBody, body)) } };
    case "confirm":
      return { body: { commission: await confirmPayout(actor, id) } };
    case "void":
      return { body: { commission: await voidPayout(actor, id, parse(ReasonBody, body).reason) } };
    default:
      throw new ApiError(404, "unknown_action", "Unknown commission action.");
  }
});

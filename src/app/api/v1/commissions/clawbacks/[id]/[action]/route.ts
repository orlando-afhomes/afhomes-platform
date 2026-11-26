import { route } from "@/server/api/route";
import { ApiError } from "@/server/api/errors";
import { ClawbackRecoveryBody, ReasonBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { recordRecovery, writeOff } from "@/server/services/commissions";

/** Direct clawback collection and write-off (doc 08 section 14). */
export const POST = route({ write: true, template: "POST /commissions/clawbacks/{id}/{action}" }, async ({ actor, params, body }) => {
  const id = pathId(params.id, "Payback");
  switch (params.action) {
    case "recovery":
      await recordRecovery(actor, id, parse(ClawbackRecoveryBody, body));
      return { body: { ok: true } };
    case "write-off":
      await writeOff(actor, id, parse(ReasonBody, body).reason);
      return { body: { ok: true } };
    default:
      throw new ApiError(404, "unknown_action", "Unknown clawback action.");
  }
});

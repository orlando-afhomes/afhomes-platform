import { route } from "@/server/api/route";
import { ApiError } from "@/server/api/errors";
import type { CardServiceInput } from "@/modules/membership/types";
import { CardServiceBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { activate, recordCardClaim, serviceCard } from "@/server/services/membership";

/** Official activation, Card Claim Date and card servicing (doc 09 §5, doc 06 §4.3, doc 09 §18). */
export const POST = route({ write: true, template: "POST /memberships/{id}/{action}" }, async ({ actor, params, body }) => {
  const id = pathId(params.id, "Membership");
  switch (params.action) {
    case "activate":
      return { body: { membership: await activate(actor, id) } };
    case "claim":
      return { body: { membership: await recordCardClaim(actor, id) } };
    case "service":
      return { body: { membership: await serviceCard(actor, id, parse(CardServiceBody, body) as CardServiceInput) } };
    default:
      throw new ApiError(404, "unknown_action", "Unknown membership action.");
  }
});

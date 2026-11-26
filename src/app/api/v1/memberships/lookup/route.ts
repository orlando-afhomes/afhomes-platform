import { route } from "@/server/api/route";
import { MembershipLookupQuery } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { lookupActiveVip } from "@/server/services/membership";

/** Staff Customer Search over active VIP memberships; never public (owner ruling R11). */
export const GET = route({ write: false, template: "GET /memberships/lookup" }, async ({ actor, request }) => {
  const query = parse(MembershipLookupQuery, Object.fromEntries(request.nextUrl.searchParams));
  return { body: { items: await lookupActiveVip(actor, query.term) } };
});

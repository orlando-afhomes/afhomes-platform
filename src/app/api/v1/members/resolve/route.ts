import { route } from "@/server/api/route";
import { findMemberByAaNumber } from "@/server/services/sales-network";

export const GET = route({ write: false, template: "GET /members/resolve" }, async ({ actor, request }) => ({
  body: { member: await findMemberByAaNumber(actor, request.nextUrl.searchParams.get("number") ?? "") },
}));

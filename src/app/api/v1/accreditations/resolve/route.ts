import { route } from "@/server/api/route";
import { resolveAaNumberForActor } from "@/server/services/accreditation";

export const GET = route({ write: false, template: "GET /accreditations/resolve" }, async ({ actor, request }) => ({
  body: { resolution: await resolveAaNumberForActor(actor, request.nextUrl.searchParams.get("number") ?? "") },
}));

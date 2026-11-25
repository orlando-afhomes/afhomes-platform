import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { getRegistration } from "@/server/services/registrations";

export const GET = route({ write: false, template: "GET /registrations/{id}" }, async ({ actor, params }) => ({
  body: { application: await getRegistration(actor, pathId(params.id, "Application")) },
}));

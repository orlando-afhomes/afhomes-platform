import { route } from "@/server/api/route";
import { DecisionBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { rejectRegistration } from "@/server/services/registrations";

export const POST = route({ write: true, template: "POST /registrations/{id}/reject" }, async ({ actor, params, body }) => ({
  body: { application: await rejectRegistration(actor, pathId(params.id, "Application"), parse(DecisionBody, body).reason) },
}));

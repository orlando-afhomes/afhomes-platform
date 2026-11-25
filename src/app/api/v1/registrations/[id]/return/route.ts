import { route } from "@/server/api/route";
import { DecisionBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { returnRegistration } from "@/server/services/registrations";

export const POST = route({ write: true, template: "POST /registrations/{id}/return" }, async ({ actor, params, body }) => ({
  body: { application: await returnRegistration(actor, pathId(params.id, "Application"), parse(DecisionBody, body).reason) },
}));

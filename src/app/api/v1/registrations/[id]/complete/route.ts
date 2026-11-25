import { route } from "@/server/api/route";
import { RegistrationCompletionBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { completeRegistration } from "@/server/services/registrations";
import type { RegistrationCompletion } from "@/modules/accreditation/types";

export const POST = route({ write: true, template: "POST /registrations/{id}/complete" }, async ({ actor, params, body }) => ({
  body: { application: await completeRegistration(actor, pathId(params.id, "Application"), parse(RegistrationCompletionBody, body) as RegistrationCompletion) },
}));

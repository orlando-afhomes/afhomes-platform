import { route } from "@/server/api/route";
import { ApproveRegistrationBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { approveRegistration } from "@/server/services/registrations";

export const POST = route({ write: true, template: "POST /registrations/{id}/approve" }, async ({ actor, params, body }) => ({
  body: { application: await approveRegistration(actor, pathId(params.id, "Application"), parse(ApproveRegistrationBody, body)) },
}));

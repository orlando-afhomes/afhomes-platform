import { publicRoute } from "@/server/api/public-route";
import { RegistrationBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { submitRegistration } from "@/server/services/registrations";

export const POST = publicRoute({ write: true, template: "POST /public/registrations" }, async ({ body }) => ({
  status: 201,
  body: await submitRegistration(parse(RegistrationBody, body)),
}));

import { publicRoute } from "@/server/api/public-route";
import { ResubmitBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { registrationForCorrection, resubmitRegistration } from "@/server/services/registrations";

export const GET = publicRoute({ write: false, template: "GET /public/registrations/correction/{token}" }, async ({ params }) => ({
  body: { view: await registrationForCorrection(params.token ?? "") },
}));

export const POST = publicRoute({ write: true, template: "POST /public/registrations/correction/{token}" }, async ({ params, body }) => ({
  body: await resubmitRegistration(params.token ?? "", parse(ResubmitBody, body).applicant),
}));

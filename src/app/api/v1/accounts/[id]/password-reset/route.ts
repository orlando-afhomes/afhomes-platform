import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { requestPasswordReset } from "@/server/services/organization";

export const POST = route({ write: true, template: "POST /accounts/{id}/password-reset" }, async ({ actor, params }) => ({
  body: await requestPasswordReset(actor, pathId(params.id, "Account")),
}));

import { route } from "@/server/api/route";
import { AccountStatusBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { updateAccountStatus } from "@/server/services/organization";

export const POST = route({ write: true, template: "POST /accounts/{id}/status" }, async ({ actor, params, body }) => ({
  body: { account: await updateAccountStatus(actor, pathId(params.id, "Account"), parse(AccountStatusBody, body).status) },
}));

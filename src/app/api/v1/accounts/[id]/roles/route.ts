import { route } from "@/server/api/route";
import { AccountRoleBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import type { DevRole } from "@/modules/identity/types";
import { assignAccountRole } from "@/server/services/organization";

export const POST = route({ write: true, template: "POST /accounts/{id}/roles" }, async ({ actor, params, body }) => ({
  body: { account: await assignAccountRole(actor, pathId(params.id, "Account"), parse(AccountRoleBody, body).role as DevRole) },
}));

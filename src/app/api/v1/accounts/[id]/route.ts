import { route } from "@/server/api/route";
import { AccountPatch } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { getAccount, updateAccount } from "@/server/services/organization";

export const GET = route({ write: false, template: "GET /accounts/{id}" }, async ({ actor, params }) => ({
  body: { account: await getAccount(actor, pathId(params.id, "Account")) },
}));

export const POST = route({ write: true, template: "POST /accounts/{id}" }, async ({ actor, params, body }) => ({
  body: { account: await updateAccount(actor, pathId(params.id, "Account"), parse(AccountPatch, body)) },
}));

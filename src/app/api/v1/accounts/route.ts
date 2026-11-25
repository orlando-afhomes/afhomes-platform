import { route } from "@/server/api/route";
import { AccountBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { createAccount, listAccounts } from "@/server/services/organization";

export const GET = route({ write: false, template: "GET /accounts" }, async ({ actor }) => ({ body: { items: await listAccounts(actor) } }));

export const POST = route({ write: true, template: "POST /accounts" }, async ({ actor, body }) => ({
  status: 201,
  body: { account: await createAccount(actor, parse(AccountBody, body)) },
}));

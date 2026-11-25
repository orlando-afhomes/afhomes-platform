import { route } from "@/server/api/route";
import { getAccountPolicies } from "@/server/services/organization";

export const GET = route({ write: false, template: "GET /accounts/policies" }, async ({ actor }) => ({ body: { policies: await getAccountPolicies(actor) } }));

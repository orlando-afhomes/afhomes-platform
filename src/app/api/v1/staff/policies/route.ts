import { route } from "@/server/api/route";
import { listStaffPolicies } from "@/server/services/organization";

export const GET = route({ write: false, template: "GET /staff/policies" }, async ({ actor }) => ({ body: { policies: await listStaffPolicies(actor) } }));

import { route } from "@/server/api/route";
import { listRoleOptions } from "@/server/services/organization";

export const GET = route({ write: false, template: "GET /roles/options" }, async ({ actor }) => ({ body: { items: await listRoleOptions(actor) } }));

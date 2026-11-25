import { route } from "@/server/api/route";
import { getStaffSelf } from "@/server/services/organization";

export const GET = route({ write: false, template: "GET /staff/self" }, async ({ actor }) => ({ body: { profile: await getStaffSelf(actor) } }));

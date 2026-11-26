import { route } from "@/server/api/route";
import { list } from "@/server/services/membership";

export const GET = route({ write: false, template: "GET /memberships" }, async ({ actor }) => ({ body: { items: await list(actor) } }));

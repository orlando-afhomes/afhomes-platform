import { route } from "@/server/api/route";
import { list } from "@/server/services/commissions";

export const GET = route({ write: false, template: "GET /commissions" }, async ({ actor }) => ({ body: { items: await list(actor) } }));

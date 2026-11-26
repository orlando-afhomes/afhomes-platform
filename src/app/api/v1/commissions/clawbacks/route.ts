import { route } from "@/server/api/route";
import { clawbacks } from "@/server/services/commissions";

export const GET = route({ write: false, template: "GET /commissions/clawbacks" }, async ({ actor }) => ({ body: { items: await clawbacks(actor) } }));

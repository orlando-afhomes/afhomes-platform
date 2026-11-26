import { route } from "@/server/api/route";
import { list } from "@/server/services/stay-points";

export const GET = route({ write: false, template: "GET /stay-points" }, async ({ actor }) => ({ body: { items: await list(actor) } }));

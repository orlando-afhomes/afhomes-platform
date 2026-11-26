import { route } from "@/server/api/route";
import { venues } from "@/server/services/stay-points";

export const GET = route({ write: false, template: "GET /stay-points/venues" }, async ({ actor }) => ({ body: { items: await venues(actor) } }));

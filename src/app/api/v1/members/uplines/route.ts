import { route } from "@/server/api/route";
import { uplineSummaries } from "@/server/services/sales-network";

export const GET = route({ write: false, template: "GET /members/uplines" }, async ({ actor }) => ({ body: { items: await uplineSummaries(actor) } }));

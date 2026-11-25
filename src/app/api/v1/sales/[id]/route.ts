import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { getSaleView } from "@/server/services/views";

export const GET = route({ write: false, template: "GET /sales/{id}" }, async ({ actor, params }) => ({
  body: { sale: await getSaleView(actor, pathId(params.id, "Sale")) },
}));

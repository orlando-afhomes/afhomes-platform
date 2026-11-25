import { route } from "@/server/api/route";
import { ReasonBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { markSaleDefaulted } from "@/server/services/sales";

export const POST = route({ write: true, template: "POST /sales/{id}/default" }, async ({ actor, params, body }) => ({
  body: { sale: await markSaleDefaulted(actor, pathId(params.id, "Sale"), parse(ReasonBody, body).reason) },
}));

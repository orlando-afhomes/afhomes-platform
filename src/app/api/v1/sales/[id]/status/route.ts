import { route } from "@/server/api/route";
import { SaleStatusChangeBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { changeSaleStatus } from "@/server/services/sales";

/** Director-style status change: a rescission or downgrade claws back released commission (doc 08 §14.1). */
export const POST = route({ write: true, template: "POST /sales/{id}/status" }, async ({ actor, params, body }) => ({
  body: { sale: await changeSaleStatus(actor, pathId(params.id, "Sale"), parse(SaleStatusChangeBody, body)) },
}));

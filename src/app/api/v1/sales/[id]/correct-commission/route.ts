import { route } from "@/server/api/route";
import { SaleCommissionCorrectionBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { correctSaleCommission } from "@/server/services/sales";

export const POST = route({ write: true, template: "POST /sales/{id}/correct-commission" }, async ({ actor, params, body }) => {
  const input = parse(SaleCommissionCorrectionBody, body);
  // An omitted referrer means "keep the current one"; only an explicit null clears it.
  return { body: { sale: await correctSaleCommission(actor, pathId(params.id, "Sale"), input) } };
});

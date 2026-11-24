import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { approveSale } from "@/server/services/sales";

export const POST = route({ write: true, template: "POST /sales/{id}/approve" }, async ({ actor, params }) => ({
  body: { sale: await approveSale(actor, pathId(params.id, "Sale")) },
}));

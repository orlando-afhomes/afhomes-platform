import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { memberParentHistory } from "@/server/services/sales-network";

export const GET = route({ write: false, template: "GET /members/{id}/history" }, async ({ actor, params }) => ({
  body: { items: await memberParentHistory(actor, pathId(params.id, "Member")) },
}));

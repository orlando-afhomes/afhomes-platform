import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { deleteIgpUnit } from "@/server/services/igp-catalog";

export const POST = route({ write: true, template: "POST /igp-catalog/units/{id}/delete" }, async ({ actor, params }) => {
  await deleteIgpUnit(actor, pathId(params.id, "Unit"));
  return { body: { ok: true } };
});

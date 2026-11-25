import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { deleteDepartment } from "@/server/services/organization";

export const POST = route({ write: true, template: "POST /departments/{id}/delete" }, async ({ actor, params }) => {
  await deleteDepartment(actor, pathId(params.id, "Department"));
  return { body: { ok: true } };
});

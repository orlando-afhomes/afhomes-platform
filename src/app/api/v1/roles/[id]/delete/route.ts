import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { deleteDepartmentRole } from "@/server/services/organization";

export const POST = route({ write: true, template: "POST /roles/{id}/delete" }, async ({ actor, params }) => {
  await deleteDepartmentRole(actor, pathId(params.id, "Role"));
  return { body: { ok: true } };
});

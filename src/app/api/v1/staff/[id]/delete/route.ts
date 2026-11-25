import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { deleteStaff } from "@/server/services/organization";

export const POST = route({ write: true, template: "POST /staff/{id}/delete" }, async ({ actor, params }) => {
  await deleteStaff(actor, pathId(params.id, "Staff member"));
  return { body: { ok: true } };
});

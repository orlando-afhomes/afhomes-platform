import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { deleteIgpProject } from "@/server/services/igp-catalog";

export const POST = route({ write: true, template: "POST /igp-catalog/projects/{id}/delete" }, async ({ actor, params }) => {
  await deleteIgpProject(actor, pathId(params.id, "Project"));
  return { body: { ok: true } };
});

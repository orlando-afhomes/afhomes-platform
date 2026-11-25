import { route } from "@/server/api/route";
import { IgpProjectPatch } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { updateIgpProject } from "@/server/services/igp-catalog";

export const POST = route({ write: true, template: "POST /igp-catalog/projects/{id}" }, async ({ actor, params, body }) => {
  const input = parse(IgpProjectPatch, body);
  return { body: { project: await updateIgpProject(actor, pathId(params.id, "Project"), input) } };
});

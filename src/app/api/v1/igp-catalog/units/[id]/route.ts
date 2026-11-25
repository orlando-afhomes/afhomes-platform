import { route } from "@/server/api/route";
import { IgpUnitPatch } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { updateIgpUnit } from "@/server/services/igp-catalog";

export const POST = route({ write: true, template: "POST /igp-catalog/units/{id}" }, async ({ actor, params, body }) => {
  const input = parse(IgpUnitPatch, body);
  return { body: { unit: await updateIgpUnit(actor, pathId(params.id, "Unit"), input) } };
});

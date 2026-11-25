import { route } from "@/server/api/route";
import { TierLevelPatch } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { updateTierLevel } from "@/server/services/catalog-admin";

export const POST = route({ write: true, template: "POST /tier-levels/{id}" }, async ({ actor, params, body }) => {
  const input = parse(TierLevelPatch, body);
  return { body: { level: await updateTierLevel(actor, params.id, input) } };
});

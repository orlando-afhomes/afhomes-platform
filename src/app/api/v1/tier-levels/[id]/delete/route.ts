import { route } from "@/server/api/route";
import { deleteTierLevel } from "@/server/services/catalog-admin";

export const POST = route({ write: true, template: "POST /tier-levels/{id}/delete" }, async ({ actor, params }) => {
  await deleteTierLevel(actor, params.id);
  return { body: { ok: true } };
});

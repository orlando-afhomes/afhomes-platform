import { route } from "@/server/api/route";
import { deactivateTierLevel } from "@/server/services/catalog-admin";

export const POST = route({ write: true, template: "POST /tier-levels/{id}/deactivate" }, async ({ actor, params }) => ({
  body: { level: await deactivateTierLevel(actor, params.id) },
}));

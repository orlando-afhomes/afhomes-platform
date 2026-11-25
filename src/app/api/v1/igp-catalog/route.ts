import { route } from "@/server/api/route";
import { listIgpCatalogFor } from "@/server/services/igp";

export const GET = route({ write: false, template: "GET /igp-catalog" }, async ({ actor }) => ({ body: await listIgpCatalogFor(actor) }));

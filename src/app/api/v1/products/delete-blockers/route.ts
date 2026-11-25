import { route } from "@/server/api/route";
import { productDeleteBlockers } from "@/server/services/catalog-admin";

export const GET = route({ write: false, template: "GET /products/delete-blockers" }, async ({ actor }) => ({ body: { blockers: await productDeleteBlockers(actor) } }));

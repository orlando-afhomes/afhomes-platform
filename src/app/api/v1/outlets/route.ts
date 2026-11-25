import { route } from "@/server/api/route";
import { loadOutlets } from "@/server/repositories/content";

export const GET = route({ write: false, template: "GET /outlets" }, async () => ({ body: { items: await loadOutlets() } }));

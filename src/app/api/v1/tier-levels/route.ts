import { route } from "@/server/api/route";
import { listTierLevels } from "@/server/services/views";

export const GET = route({ write: false, template: "GET /tier-levels" }, async () => ({ body: { items: await listTierLevels() } }));

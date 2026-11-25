import { route } from "@/server/api/route";
import { loadReferenceEntries } from "@/server/repositories/content";

/** Reference lists are readable by every signed-in identity: forms fill their selects from them. */
export const GET = route({ write: false, template: "GET /reference-lists" }, async () => ({ body: { items: await loadReferenceEntries() } }));

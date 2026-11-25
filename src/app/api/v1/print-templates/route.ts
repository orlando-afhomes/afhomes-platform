import { route } from "@/server/api/route";
import { loadPrintTemplates } from "@/server/repositories/content";

/** The confirmed printable-form and card registry, with the revision label for each supplied design. */
export const GET = route({ write: false, template: "GET /print-templates" }, async () => ({ body: { items: await loadPrintTemplates() } }));

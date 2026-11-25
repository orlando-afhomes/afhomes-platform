import { route } from "@/server/api/route";
import { listAccreditations } from "@/server/services/accreditation";

export const GET = route({ write: false, template: "GET /accreditations" }, async ({ actor }) => ({ body: { items: await listAccreditations(actor) } }));

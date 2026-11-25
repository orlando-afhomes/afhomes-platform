import { route } from "@/server/api/route";
import { listMemberViews } from "@/server/services/views";

export const GET = route({ write: false, template: "GET /members" }, async ({ actor }) => ({ body: { items: await listMemberViews(actor) } }));

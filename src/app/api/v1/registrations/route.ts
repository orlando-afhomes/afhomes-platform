import { route } from "@/server/api/route";
import { listRegistrations } from "@/server/services/registrations";

export const GET = route({ write: false, template: "GET /registrations" }, async ({ actor }) => ({ body: { items: await listRegistrations(actor) } }));

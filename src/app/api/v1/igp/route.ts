import { route } from "@/server/api/route";
import { igpRegister } from "@/server/services/igp";

export const GET = route({ write: false, template: "GET /igp" }, async ({ actor }) => ({ body: await igpRegister(actor) }));

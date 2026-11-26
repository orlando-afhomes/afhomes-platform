import { route } from "@/server/api/route";
import { listAuditActors } from "@/server/services/audit-read";

/** Everyone who appears as an actor in the audit history, for the actor filter. */
export const GET = route({ write: false, template: "GET /audit/actors" }, async ({ actor }) => ({
  body: { items: await listAuditActors(actor) },
}));

import { route } from "@/server/api/route";
import { AuditQuerySchema } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import type { AuditQuery } from "@/modules/audit/types";
import { listAuditEvents } from "@/server/services/audit-read";

/** Read-only audit history with filters and paging (doc 12 section 19). */
export const GET = route({ write: false, template: "GET /audit" }, async ({ actor, request }) => ({
  body: await listAuditEvents(actor, parse(AuditQuerySchema, Object.fromEntries(request.nextUrl.searchParams)) as AuditQuery),
}));

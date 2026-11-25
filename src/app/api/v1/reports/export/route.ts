import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { route } from "@/server/api/route";
import { ReportExportBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { recordAudit } from "@/server/audit";
import { requireModule } from "@/server/auth/authorize";

/**
 * Audits one report export. Only the report name, format, range and row count are
 * recorded, never row data (doc 12 section 9).
 */
export const POST = route({ write: true, template: "POST /reports/export" }, async ({ actor, body }) => {
  const input = parse(ReportExportBody, body);
  requireModule(actor, "reports");
  await recordAudit({
    actorUserId: actor.userId,
    action: BUSINESS_AUDIT_ACTIONS.REPORT_EXPORTED,
    entityType: "report-export",
    entityId: input.report,
    correlationId: crypto.randomUUID(),
    details: {
      format: input.format,
      range: input.range ? `${input.range.from}..${input.range.to}` : "none",
      rowCount: input.rowCount,
    },
  });
  return { status: 201, body: { ok: true } };
});

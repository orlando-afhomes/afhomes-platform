import "server-only";
import { dbWrite } from "@/server/db";
import { auditModuleOf } from "@/server/services/common";

export type AuditInput = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  correlationId?: string;
  /** Never put credentials, tokens or unnecessary personal data here. */
  details?: Record<string, unknown>;
};

/** Appends one audit event. The connector exposes insert only, so history is never edited here. */
export async function recordAudit(input: AuditInput): Promise<void> {
  await dbWrite(
    `mutation($d: AuditEvent_Data!) { auditEvent_insert(data: $d) }`,
    {
      d: {
        actorId: input.actorUserId ?? undefined,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        module: auditModuleOf(input),
        correlationId: input.correlationId,
        details: input.details ?? {},
      },
    },
  );
}

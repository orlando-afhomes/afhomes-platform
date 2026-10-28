import type { AuditEvent } from "@/modules/audit/types";
import type { MockStore } from "./seed";

/**
 * Append-only audit writer for in-memory mock operations. Called only after a
 * state change commits, so failed operations never produce success events.
 * Never pass passwords, government ID numbers, or document contents.
 */
export function appendAuditEvent(
  store: MockStore,
  event: Omit<AuditEvent, "id" | "timestamp">,
): AuditEvent {
  const entry: AuditEvent = {
    ...event,
    id: `audit-${store.auditSequence}`,
    timestamp: new Date().toISOString(),
  };
  store.auditSequence += 1;
  store.auditEvents.push(entry);
  return { ...entry, relatedRecordIds: entry.relatedRecordIds ? [...entry.relatedRecordIds] : undefined };
}

"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AUDIT_MODULES, type AuditEventView, type AuditModule } from "@/modules/audit/types";
import { useAuditEvents } from "@/data/queries";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { isCreationEvent } from "@/modules/notifications/creation-actions";
import { MODULE_PRIMARY_NAV } from "@/modules/notifications/module-nav";

export type NotificationsValue = {
  unreadTotal: number;
  unreadByNavKey: Readonly<Record<string, number>>;
  /** Newest-first bell list, capped at 30 events. */
  events: AuditEventView[];
  /** True when the audit query is denied (non-admin): events are [] and counts are zero. */
  denied: boolean;
  markAllSeen: () => void;
};

/** Named export for tests. Null outside the provider; useNotifications() falls back to EMPTY_NOTIFICATIONS. */
export const NotificationsContext = createContext<NotificationsValue | null>(null);

const EMPTY_NOTIFICATIONS: NotificationsValue = {
  unreadTotal: 0,
  unreadByNavKey: {},
  events: [],
  denied: false,
  markAllSeen: () => {},
};

/** Sequence number of an audit event id (`audit-N`). Pure; unparseable ids sort as 0. */
function seqOf(event: Pick<AuditEventView, "id">): number {
  const match = /(\d+)$/.exec(event.id);
  return match ? Number.parseInt(match[1], 10) : 0;
}

/** Latch the newest seen sequence per module from the loaded items. Pure. */
function latchSeen(items: readonly AuditEventView[]): Record<AuditModule, number> {
  const seen = {} as Record<AuditModule, number>;
  for (const auditModule of AUDIT_MODULES) seen[auditModule] = 0;
  for (const event of items) {
    const seq = seqOf(event);
    if (seq > (seen[event.module] ?? 0)) seen[event.module] = seq;
  }
  return seen;
}

/**
 * Memory-only notification state (no localStorage). Badges count only unseen
 * brand-new-record creation events (sequence above the latched per-module
 * sequence); the bell lists the newest 30 events of every kind.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { identity } = useDevIdentity();
  const pathname = usePathname();
  const audit = useAuditEvents({ pageSize: 100 });
  const denied = audit.isError;
  const currentPath = pathname ?? "/admin";
  const items = useMemo(() => audit.data?.items ?? [], [audit.data]);

  // Seen markers adjust during render (React's "adjust state when props
  // change" pattern: conditioned on identity/path/first-data change, so no
  // render loop; everything is pure, no clocks). Identity switch resets every
  // marker (no cross-identity leaks); visiting a page re-latches to the loaded
  // items so its modules read as seen.
  const [tracker, setTracker] = useState(() => ({ identityId: identity.id, path: currentPath, seenSeq: null as Record<AuditModule, number> | null }));
  const epochChanged = identity.id !== tracker.identityId || currentPath !== tracker.path;
  // Latch once per epoch when data is first available (never on empty data,
  // or every pre-existing record would badge). Later refetches with new
  // events do not re-latch, so post-mount creations stay unread.
  if ((epochChanged || tracker.seenSeq === null) && items.length > 0) {
    setTracker({ identityId: identity.id, path: currentPath, seenSeq: latchSeen(items) });
  }
  const seenSeq = tracker.seenSeq;

  const events = useMemo<AuditEventView[]>(() => {
    if (denied) return [];
    return (audit.data?.items ?? []).slice(0, 30);
  }, [denied, audit.data]);

  const unreadByNavKey = useMemo<Readonly<Record<string, number>>>(() => {
    const byNavKey: Record<string, number> = {};
    for (const auditModule of AUDIT_MODULES) byNavKey[MODULE_PRIMARY_NAV[auditModule]] = 0;
    if (denied || seenSeq === null) return byNavKey;
    for (const event of items) {
      if (!isCreationEvent(event.module, event.action)) continue;
      if (seqOf(event) <= (seenSeq[event.module] ?? 0)) continue;
      const navKey = MODULE_PRIMARY_NAV[event.module];
      byNavKey[navKey] = (byNavKey[navKey] ?? 0) + 1;
    }
    return byNavKey;
  }, [denied, items, seenSeq]);

  const markAllSeen = useCallback(() => {
    setTracker((prev) => ({ ...prev, seenSeq: latchSeen(items) }));
  }, [items]);

  const value = useMemo<NotificationsValue>(() => {
    const unreadTotal = Object.values(unreadByNavKey).reduce((sum, count) => sum + count, 0);
    return { unreadTotal, unreadByNavKey, events, denied, markAllSeen };
  }, [unreadByNavKey, events, denied, markAllSeen]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

/** Zero-count fallback outside the provider, so bare navlist renders stay badge-free. */
export function useNotifications(): NotificationsValue {
  return useContext(NotificationsContext) ?? EMPTY_NOTIFICATIONS;
}

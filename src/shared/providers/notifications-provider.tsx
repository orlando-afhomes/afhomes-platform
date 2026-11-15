"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AUDIT_MODULES, type AuditEventView, type AuditModule } from "@/modules/audit/types";
import { useAuditEvents } from "@/data/queries";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { isCreationEvent } from "@/modules/notifications/creation-actions";
import { MODULE_PRIMARY_NAV, modulesForNavKey } from "@/modules/notifications/module-nav";
import { findSelectedKeys } from "@/panels/admin/components/admin-nav-match";
import { adminNavigation, type AdminNavKey } from "@/panels/admin/navigation";

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

/** Latched sequence number per audit module. */
type SeenSeq = Record<AuditModule, number>;

/** Sequence number of an audit event id (`audit-N`). Pure; unparseable ids sort as 0. */
function seqOf(event: Pick<AuditEventView, "id">): number {
  const match = /(\d+)$/.exec(event.id);
  return match ? Number.parseInt(match[1], 10) : 0;
}

/** Latch the newest seen sequence per module from the loaded items. Pure. */
function latchSeen(items: readonly AuditEventView[]): SeenSeq {
  const seen = {} as SeenSeq;
  for (const auditModule of AUDIT_MODULES) seen[auditModule] = 0;
  for (const event of items) {
    const seq = seqOf(event);
    if (seq > (seen[event.module] ?? 0)) seen[event.module] = seq;
  }
  return seen;
}

/**
 * Latch only the given modules to their newest loaded sequence; every other
 * module keeps its marker, so badges outside the visited area stay unread.
 * Pure (sequence numbers only).
 */
function latchModules(seen: SeenSeq, items: readonly AuditEventView[], auditModules: readonly AuditModule[]): SeenSeq {
  if (auditModules.length === 0) return seen;
  const next = { ...seen };
  for (const auditModule of auditModules) {
    let newest = next[auditModule] ?? 0;
    for (const event of items) {
      if (event.module !== auditModule) continue;
      const seq = seqOf(event);
      if (seq > newest) newest = seq;
    }
    next[auditModule] = newest;
  }
  return next;
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
  // Audit modules whose badge renders on the area the current route selects.
  const selectedModules = useMemo<AuditModule[]>(() => {
    const modules = new Set<AuditModule>();
    for (const navKey of findSelectedKeys(adminNavigation, currentPath) as AdminNavKey[]) {
      for (const auditModule of modulesForNavKey(navKey)) modules.add(auditModule);
    }
    return [...modules];
  }, [currentPath]);

  // Seen markers adjust during render (React's "adjust state when props
  // change" pattern: each branch is conditioned on a tracker field, so no
  // render loop; everything is pure, no clocks).
  // - First non-empty load: latch every module, so records that existed before
  //   mount never badge. Later refetches do not re-latch (post-mount creations
  //   stay unread).
  // - Identity switch: re-latch every module (no cross-identity markers).
  // - Path change: re-latch only the visited area's modules, so navigating
  //   away from a badge does not mark that badge seen.
  const [tracker, setTracker] = useState(() => ({ identityId: identity.id, path: currentPath, seenSeq: null as SeenSeq | null }));
  if (items.length > 0) {
    if (identity.id !== tracker.identityId || tracker.seenSeq === null) {
      setTracker({ identityId: identity.id, path: currentPath, seenSeq: latchSeen(items) });
    } else if (currentPath !== tracker.path) {
      setTracker({ identityId: identity.id, path: currentPath, seenSeq: latchModules(tracker.seenSeq, items, selectedModules) });
    }
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

"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { AuditEventView } from "@/modules/audit/types";
import { useAuditEvents, useEffectiveModuleIds } from "@/data/queries";
import { getGrantedOperations } from "@/modules/identity/permissions";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { isNotificationBadgeEvent } from "@/modules/notifications/creation-actions";
import { isAreaNavKey, notificationDestination } from "@/modules/notifications/module-nav";
import { findSelectedKeys } from "@/panels/admin/components/admin-nav-match";
import { ADMIN_AREA_TABS, adminAreaHref, adminNavigation, isNavRuleAllowed, normalizePath, type AdminAreaTabRule, type AdminNavKey } from "@/panels/admin/navigation";

export type NotificationsValue = {
  unreadTotal: number;
  unreadByNavKey: Readonly<Record<string, number>>;
  unreadByTab: Readonly<Record<string, number>>;
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
  unreadByTab: {},
  events: [],
  denied: false,
  markAllSeen: () => {},
};

const NO_AREA_TABS: readonly AdminAreaTabRule[] = [];

/** Latched sequence number per area tab. */
type SeenSeq = Record<string, number>;

function tabKey(area: string, tab: string) {
  return `${area}:${tab}`;
}

/** Sequence number of an audit event id (`audit-N`). Pure; unparseable ids sort as 0. */
function seqOf(event: Pick<AuditEventView, "id">): number {
  const match = /(\d+)$/.exec(event.id);
  return match ? Number.parseInt(match[1], 10) : 0;
}

/** Latch the newest seen sequence per tab from the loaded items. */
function latchSeen(items: readonly AuditEventView[]): SeenSeq {
  const seen: SeenSeq = {};
  for (const event of items) {
    const seq = seqOf(event);
    const { area, tab } = notificationDestination(event);
    const key = tabKey(area, tab);
    if (seq > (seen[key] ?? 0)) seen[key] = seq;
  }
  return seen;
}

/**
 * Memory-only notification state (no localStorage). Badges count only unseen
 * brand-new-record creation events (sequence above the latched per-tab
 * sequence); the bell lists the newest 30 events of every kind.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { identity } = useDevIdentity();
  const pathname = usePathname();
  const requestedTab = useSearchParams()?.get("tab");
  const grants = useEffectiveModuleIds();
  const operations = useMemo(() => getGrantedOperations(identity), [identity]);
  const audit = useAuditEvents({ pageSize: 100 });
  const denied = audit.isError;
  const currentPath = normalizePath(pathname ?? "/admin");
  const items = useMemo(() => audit.data?.items ?? [], [audit.data]);
  const [navKey] = findSelectedKeys(adminNavigation, currentPath) as AdminNavKey[];
  const activeArea = navKey && isAreaNavKey(navKey) ? navKey : undefined;
  const areaTabs: readonly AdminAreaTabRule[] = activeArea ? ADMIN_AREA_TABS[activeArea] : NO_AREA_TABS;
  const allowedTabs = areaTabs.filter(({ rule }) => isNavRuleAllowed(rule, grants, operations));
  const isAreaPage = activeArea && currentPath === adminAreaHref(activeArea);
  const visitedTab = activeArea && (isAreaPage
    ? allowedTabs.find(({ value }) => value === requestedTab) ?? allowedTabs[0]
    : allowedTabs.filter(({ formerHref }) => currentPath === formerHref || (formerHref !== adminAreaHref(activeArea) && currentPath.startsWith(`${formerHref}/`)))
      .sort((a, b) => b.formerHref.length - a.formerHref.length)[0]);
  const visitedKey = activeArea && visitedTab ? tabKey(activeArea, visitedTab.value) : undefined;

  // Seen markers adjust during render (React's "adjust state when props
  // change" pattern: each branch is conditioned on a tracker field, so no
  // render loop; everything is pure, no clocks).
  // - First successful load: latch every tab, so records that existed before
  //   mount never badge. Later refetches do not re-latch (post-mount creations
  //   stay unread).
  // - Identity switch: re-latch every tab (no cross-identity markers).
  // - Tab change: re-latch only that tab so sibling counts remain visible.
  const [tracker, setTracker] = useState(() => ({ identityId: identity.id, visitedKey, seenSeq: null as SeenSeq | null }));
  if (audit.isSuccess) {
    if (identity.id !== tracker.identityId || tracker.seenSeq === null) {
      setTracker({ identityId: identity.id, visitedKey, seenSeq: latchSeen(items) });
    } else if (visitedKey !== tracker.visitedKey) {
      const seenSeq = visitedKey
        ? { ...tracker.seenSeq, [visitedKey]: Math.max(tracker.seenSeq[visitedKey] ?? 0, latchSeen(items)[visitedKey] ?? 0) }
        : tracker.seenSeq;
      setTracker({ identityId: identity.id, visitedKey, seenSeq });
    }
  }
  const seenSeq = tracker.seenSeq;

  const events = useMemo<AuditEventView[]>(() => {
    if (denied) return [];
    return (audit.data?.items ?? []).slice(0, 30);
  }, [denied, audit.data]);

  const counts = useMemo(() => {
    const byNavKey: Record<string, number> = {};
    const byTab: Record<string, number> = {};
    let total = 0;
    if (denied || seenSeq === null) return { byNavKey, byTab, total };
    for (const area of Object.keys(ADMIN_AREA_TABS)) byNavKey[area] = 0;
    for (const event of items) {
      if (!isNotificationBadgeEvent(event)) continue;
      const { area, tab } = notificationDestination(event);
      const key = tabKey(area, tab);
      if (seqOf(event) <= (seenSeq[key] ?? 0)) continue;
      const rule = (ADMIN_AREA_TABS[area] as readonly AdminAreaTabRule[]).find(({ value }) => value === tab)?.rule;
      if (!rule || !isNavRuleAllowed(rule, grants, operations)) continue;
      byNavKey[area] += 1;
      byTab[key] = (byTab[key] ?? 0) + 1;
      total += 1;
    }
    return { byNavKey, byTab, total };
  }, [denied, grants, items, operations, seenSeq]);

  const markAllSeen = useCallback(() => {
    setTracker((prev) => ({ ...prev, seenSeq: latchSeen(items) }));
  }, [items]);

  const value = useMemo<NotificationsValue>(() => {
    const unreadByTab: Record<string, number> = {};
    if (activeArea) for (const { value } of areaTabs) unreadByTab[value] = counts.byTab[tabKey(activeArea, value)] ?? 0;
    return { unreadTotal: counts.total, unreadByNavKey: counts.byNavKey, unreadByTab, events, denied, markAllSeen };
  }, [activeArea, areaTabs, counts, events, denied, markAllSeen]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

/** Zero-count fallback outside the provider, so bare navlist renders stay badge-free. */
export function useNotifications(): NotificationsValue {
  return useContext(NotificationsContext) ?? EMPTY_NOTIFICATIONS;
}

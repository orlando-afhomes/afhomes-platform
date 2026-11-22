"use client";

import { createContext, useContext } from "react";
import type { AuditEventView } from "@/modules/audit/types";

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

/** Zero-count fallback outside the provider, so bare navlist renders stay badge-free. */
export function useNotifications(): NotificationsValue {
  return useContext(NotificationsContext) ?? EMPTY_NOTIFICATIONS;
}

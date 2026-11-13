"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { MODULE_PRIMARY_NAV } from "@/modules/notifications/module-nav";
import { isCreationEvent } from "@/modules/notifications/creation-actions";
import { formatNotificationTime } from "@/modules/notifications/format-time";
import type { AuditModule } from "@/modules/audit/types";
import type { AdminModuleId } from "@/modules/identity/permissions";
import { useEffectiveModuleIds } from "@/data/queries";
import { adminNavigation, type AdminNavItem, type AdminNavKey } from "@/panels/admin/navigation";
import { useNotifications } from "@/shared/providers/notifications-provider";
import { humanize } from "@/shared/lib/humanize";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

function findNavItem(items: readonly AdminNavItem[], navKey: AdminNavKey): AdminNavItem | null {
  for (const item of items) {
    if (item.id === navKey) return item;
    if (item.children) {
      const found = findNavItem(item.children, navKey);
      if (found) return found;
    }
  }
  return null;
}

/** Primary page href for an audit module; falls back to /admin when unmapped. */
function hrefForModule(module: AuditModule): string {
  const navKey = MODULE_PRIMARY_NAV[module];
  if (!navKey) return "/admin";
  return findNavItem(adminNavigation, navKey)?.href ?? "/admin";
}

/**
 * Module grants of the active identity, or null when the identity/store
 * providers are unavailable (e.g. an isolated render). Null means the
 * permission filter is skipped and every event is shown.
 */
function useGrantedModules(): Set<AdminModuleId> | null {
  try {
    return useEffectiveModuleIds();
  } catch {
    return null;
  }
}

/**
 * True when the module's primary page is visible to the identity. Mirrors the
 * sidebar grant check (item grants default to its own id); operation-level
 * requirements are not evaluated here, so access is fail-open on those.
 * Missing nav items and unavailable grants also fail open.
 */
function isModuleVisible(module: AuditModule, granted: Set<AdminModuleId> | null): boolean {
  if (!granted) return true;
  const navKey = MODULE_PRIMARY_NAV[module];
  if (!navKey) return true;
  const item = findNavItem(adminNavigation, navKey);
  if (!item) return true;
  const grants = item.grants ?? [item.id as AdminModuleId];
  return grants.some((grant) => granted.has(grant));
}

const MAX_ROWS = 30;

export function NotificationsMenu() {
  const { unreadTotal, events, denied, markAllSeen } = useNotifications();
  const granted = useGrantedModules();
  const visible = useMemo(
    () => events.filter((event) => isModuleVisible(event.module, granted)).slice(0, MAX_ROWS),
    [events, granted],
  );
  const badge = unreadTotal > 99 ? "99+" : String(unreadTotal);
  const triggerLabel = unreadTotal > 0 ? `Notifications, ${unreadTotal} unread` : "Notifications, none unread";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label={triggerLabel} className="tw:relative" />}
      >
        <Bell aria-hidden="true" />
        {unreadTotal > 0 ? (
          <span
            aria-hidden="true"
            className="tw:absolute tw:-top-0.5 tw:-right-0.5 tw:flex tw:h-5 tw:min-w-5 tw:items-center tw:justify-center tw:rounded-full tw:bg-destructive tw:px-1 tw:text-[11px] tw:font-bold tw:text-destructive-foreground"
          >
            {badge}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="tw:w-80 tw:max-w-[calc(100vw-2rem)]">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {denied ? (
          <p className="tw:px-2 tw:py-4 tw:text-center tw:text-sm tw:text-muted-foreground">
            Notifications are available to administrators.
          </p>
        ) : visible.length === 0 ? (
          <p className="tw:px-2 tw:py-4 tw:text-center tw:text-sm tw:text-muted-foreground">No new notifications.</p>
        ) : (
          <>
            <div className="tw:max-h-80 tw:overflow-y-auto">
              {visible.map((event) => {
                // Row-level seen state is not exposed by the provider, so the
                // unread treatment follows the badge semantics: brand-new
                // record creation events read as unread.
                const unread = isCreationEvent(event.module, event.action);
                return (
                  <DropdownMenuItem
                    key={event.id}
                    render={<Link href={hrefForModule(event.module)} />}
                    className={
                      unread
                        ? "tw:min-h-11 tw:items-start tw:bg-accent/60 tw:py-2"
                        : "tw:min-h-11 tw:items-start tw:py-2"
                    }
                  >
                    {unread ? (
                      <span aria-hidden="true" className="tw:mt-2 tw:size-1.5 tw:shrink-0 tw:rounded-full tw:bg-primary" />
                    ) : null}
                    <span className="tw:min-w-0 tw:flex-1">
                      <span className="tw:block tw:truncate tw:text-sm tw:font-medium tw:text-foreground">
                        {unread ? <span className="tw:sr-only">Unread: </span> : null}
                        {event.actorName}
                      </span>
                      <span className="tw:block tw:truncate tw:text-[13px] tw:text-muted-foreground">
                        {humanize(event.action)} · {event.entityLabel}
                      </span>
                      <span className="tw:block tw:text-xs tw:text-muted-foreground">
                        {humanize(event.module)} ·{" "}
                        <time dateTime={event.timestamp}>{formatNotificationTime(event.timestamp)}</time>
                      </span>
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </div>
            <DropdownMenuSeparator />
            <div className="tw:p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={markAllSeen}
                disabled={unreadTotal === 0}
                className="tw:w-full"
              >
                Mark all as read
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

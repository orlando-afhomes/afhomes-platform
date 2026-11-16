"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { notificationDestination } from "@/modules/notifications/module-nav";
import { isNotificationBadgeEvent } from "@/modules/notifications/creation-actions";
import { formatNotificationTime } from "@/modules/notifications/format-time";
import { getGrantedOperations } from "@/modules/identity/permissions";
import { useEffectiveModuleIds } from "@/data/queries";
import { ADMIN_AREA_TABS, adminAreaHref, isNavRuleAllowed, type AdminAreaTabRule } from "@/panels/admin/navigation";
import { useNotifications } from "@/shared/providers/notifications-provider";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { humanize } from "@/shared/lib/humanize";
import { formatNotificationAction } from "@/modules/notifications/format-action";
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

const MAX_ROWS = 30;

export function NotificationsMenu() {
  const { unreadTotal, events, denied, markAllSeen } = useNotifications();
  const { identity } = useDevIdentity();
  const modules = useEffectiveModuleIds();
  const operations = useMemo(() => getGrantedOperations(identity), [identity]);
  const visible = useMemo(
    () => events.flatMap((event) => {
      const { area, tab } = notificationDestination(event);
      const tabs: readonly AdminAreaTabRule[] = ADMIN_AREA_TABS[area];
      const index = tabs.findIndex(({ value }) => value === tab);
      if (index < 0 || !isNavRuleAllowed(tabs[index].rule, modules, operations)) return [];
      const href = adminAreaHref(area);
      return [{ event, href: index === 0 ? href : `${href}?tab=${tab}` }];
    }).slice(0, MAX_ROWS),
    [events, modules, operations],
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
            className="tw:absolute tw:-top-0.5 tw:-right-0.5 tw:flex tw:h-5 tw:min-w-5 tw:items-center tw:justify-center tw:rounded-full tw:bg-destructive tw:px-1 tw:text-[11px] tw:font-bold tw:text-white"
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
              {visible.map(({ event, href }) => {
                // Row-level seen state is not exposed by the provider, so the
                // unread treatment follows the badge semantics: brand-new
                // record creation events read as unread.
                const unread = isNotificationBadgeEvent(event);
                return (
                  <DropdownMenuItem
                    key={event.id}
                    render={<Link href={href} />}
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
                        {formatNotificationAction(event.action)} · {event.entityLabel}
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

"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, ChevronDown, IdCard, Landmark, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useNotifications } from "@/shared/providers/notifications-provider";
import type { AdminNavItem } from "../navigation";
import { ADMIN_NAV_ICONS } from "./admin-nav-icons";
import { findSelectedKeys } from "./admin-nav-match";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";

const ROW =
  "tw:group/nav tw:relative tw:flex tw:w-full tw:min-h-11 tw:items-center tw:gap-3 tw:rounded-xl tw:px-2 tw:py-1.5 tw:text-left tw:text-sm tw:font-medium tw:text-sidebar-foreground/80 tw:transition-colors tw:hover:bg-white/[0.07] tw:hover:text-sidebar-foreground tw:focus-visible:ring-2 tw:focus-visible:ring-sidebar-ring tw:focus-visible:outline-none tw:motion-reduce:transition-none";
// The current page: soft tint, bolder text, a white icon and aria-current (no side bar, no white block).
const ROW_SELECTED =
  "tw:bg-white/10 tw:font-semibold tw:text-sidebar-foreground";
const CHIP =
  "tw:inline-flex tw:size-8 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:bg-white/[0.07] tw:text-sidebar-foreground/85 tw:transition-colors tw:group-hover/nav:bg-white/15 tw:motion-reduce:transition-none";
const CHIP_SELECTED = "tw:bg-white/15 tw:text-white tw:group-hover/nav:bg-white/20";
const GROUP_TRIGGER = "tw:aria-expanded:text-sidebar-foreground";

// Badge counts are capped at render: the provider keeps exact counts, the nav
// shows "99+" past 99.
function formatBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

const BADGE_PILL =
  "tw:ml-auto tw:inline-flex tw:h-5 tw:min-w-5 tw:items-center tw:justify-center tw:rounded-full tw:bg-destructive tw:px-1 tw:text-xs tw:font-semibold tw:text-white tw:ring-2 tw:ring-(--color-brand-deep)";

const NAV_GROUPS: { label: string; icon: LucideIcon; members: readonly AdminNavItem["id"][] }[] = [
  { label: "Money", icon: Landmark, members: ["finance", "commissions"] },
  { label: "Member Services", icon: IdCard, members: ["membership", "stay-points", "redemption"] },
  { label: "Management", icon: Building2, members: ["vip-products", "sales-network", "organization"] },
  { label: "Reports and Audit", icon: BarChart3, members: ["reports", "audit-logs"] },
];

/** Groups are applied after filtering so they only contain destinations the user can open. */
export function AdminNavList({
  items,
  onNavigate,
  pathname: pathnameProp,
  collapsed = false,
}: {
  items?: AdminNavItem[];
  onNavigate?: () => void;
  pathname?: string | null;
  collapsed?: boolean;
}) {
  const hookPathname = usePathname();
  const pathname = pathnameProp ?? hookPathname ?? "/";
  const list = items ?? [];
  const selected = new Set(findSelectedKeys(list, pathname));
  const activeGroup = NAV_GROUPS.find((group) => group.members.some((id) => selected.has(id)))?.label ?? null;
  const [disclosure, setDisclosure] = useState<{ activeGroup: string | null; open: string | null }>();
  const openGroup = disclosure?.activeGroup === activeGroup ? disclosure.open : activeGroup;
  const { unreadByNavKey } = useNotifications();
  const badgeFor = (id: string) => unreadByNavKey[id] ?? 0;
  const direct = list.filter((item) => !NAV_GROUPS.some((group) => group.members.includes(item.id)));

  return (
    <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-0.5 tw:p-0">
      {direct.map((item) => (
        <NavLink key={item.id} item={item} selected={selected.has(item.id)} collapsed={collapsed} badge={badgeFor(item.id)} onNavigate={onNavigate} />
      ))}
      {NAV_GROUPS.map(({ label, icon: Icon, members }) => {
        const children = list.filter((item) => members.includes(item.id));
        if (children.length === 0) return null;
        const badge = children.reduce((sum, child) => sum + badgeFor(child.id), 0);
        const selectedChild = activeGroup === label;
        if (collapsed) {
          return (
            <li key={label}>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" className={cn(ROW, GROUP_TRIGGER, "tw:relative tw:justify-center tw:px-0 tw:aria-expanded:bg-white/10", selectedChild && ROW_SELECTED)} />}
                  aria-label={badge ? `${label}, ${badge} new` : label} title={label}>
                  <span className={cn(CHIP, selectedChild && CHIP_SELECTED)}><Icon aria-hidden="true" className="tw:size-4" /></span>
                  {badge ? <span aria-hidden="true" className="tw:absolute tw:top-1.5 tw:right-1.5 tw:size-2 tw:rounded-full tw:bg-destructive" /> : null}
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" className="tw:w-48">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{label}</DropdownMenuLabel>
                    {children.map((child) => (
                      <DropdownMenuItem key={child.id} render={<Link href={child.href} onClick={onNavigate} aria-current={selected.has(child.id) ? "page" : undefined} />}>
                        {child.label}
                        {badgeFor(child.id) > 0 ? <NavBadge count={badgeFor(child.id)} /> : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          );
        }
        return (
          <NavGroup key={label} label={label} icon={Icon} open={openGroup === label} selectedChild={selectedChild} badge={badge}
            onToggle={() => setDisclosure({ activeGroup, open: openGroup === label ? null : label })}>
            {children.map((child) => (
              <NavLink key={child.id} item={child} selected={selected.has(child.id)} nested badge={badgeFor(child.id)} onNavigate={onNavigate} />
            ))}
          </NavGroup>
        );
      })}
    </ul>
  );
}

function NavLink({
  item,
  selected,
  nested = false,
  collapsed = false,
  badge = 0,
  onNavigate,
}: {
  item: AdminNavItem;
  selected: boolean;
  nested?: boolean;
  collapsed?: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  const Icon = ADMIN_NAV_ICONS[item.id];
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={selected ? "page" : undefined}
        aria-label={collapsed ? item.label : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(ROW, nested && "tw:min-h-10 tw:px-3 tw:leading-snug", collapsed && "tw:relative tw:justify-center tw:px-0", selected && ROW_SELECTED)}
      >
        {Icon ? (
          nested ? (
            <Icon aria-hidden="true" className="tw:size-4 tw:shrink-0" />
          ) : (
            <span className={cn(CHIP, selected && CHIP_SELECTED)}><Icon aria-hidden="true" className="tw:size-4" /></span>
          )
        ) : null}
        {collapsed ? null : <span className="tw:min-w-0">{item.label}</span>}
        {badge > 0 ? (
          collapsed ? (
            <span
              role="img"
              aria-label={`${badge} new`}
              title={`${badge} new`}
              className="tw:absolute tw:top-1.5 tw:right-1.5 tw:size-2 tw:rounded-full tw:bg-destructive"
            />
          ) : (
            <NavBadge count={badge} />
          )
        ) : null}
      </Link>
    </li>
  );
}

function NavGroup({
  label,
  icon: Icon,
  open,
  selectedChild,
  badge = 0,
  onToggle,
  children,
}: {
  label: string;
  icon: LucideIcon;
  open: boolean;
  selectedChild: boolean;
  badge?: number;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const panelId = useId();
  return (
    <li>
      <Button
        type="button"
        variant="ghost"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={cn(ROW, GROUP_TRIGGER, selectedChild
          ? "tw:font-semibold tw:text-sidebar-foreground tw:aria-expanded:bg-transparent tw:aria-expanded:hover:bg-white/[0.07]"
          : "tw:aria-expanded:bg-white/10")}
      >
        <span className={cn(CHIP, selectedChild && CHIP_SELECTED)}><Icon aria-hidden="true" className="tw:size-4" /></span>
        <span className="tw:min-w-0 tw:flex-1">{label}</span>
        {badge > 0 && !open ? <NavBadge count={badge} /> : null}
        <ChevronDown
          aria-hidden="true"
          className={cn("tw:size-4 tw:shrink-0 tw:transition-transform tw:motion-reduce:transition-none", open && "tw:rotate-180")}
        />
      </Button>
      <div
        className={cn("tw:grid tw:transition-[grid-template-rows] tw:duration-200 tw:ease-out", open ? "tw:grid-rows-[1fr]" : "tw:grid-rows-[0fr]")}
        inert={!open}
      >
        <ul id={panelId} className="tw:m-0 tw:mt-0.5 tw:ml-6 tw:flex tw:min-h-0 tw:list-none tw:flex-col tw:gap-0.5 tw:overflow-hidden tw:border-l tw:border-white/15 tw:p-0 tw:pl-2">
          {children}
        </ul>
      </div>
    </li>
  );
}

function NavBadge({ count }: { count: number }) {
  return <span aria-label={`${count} new`} className={BADGE_PILL}>{formatBadgeCount(count)}</span>;
}

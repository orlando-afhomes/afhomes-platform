"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { AdminNavItem } from "../navigation";
import { ADMIN_NAV_ICONS } from "./admin-nav-icons";
import { findOpenKeys, findSelectedKeys } from "./admin-nav-match";

const ROW =
  "tw:flex tw:w-full tw:min-h-11 tw:items-center tw:gap-3 tw:rounded-lg tw:px-3 tw:py-2 tw:text-left tw:text-sm tw:font-medium tw:text-sidebar-foreground/90 tw:transition-colors tw:hover:bg-sidebar-accent tw:hover:text-sidebar-foreground tw:focus-visible:ring-2 tw:focus-visible:ring-sidebar-ring tw:focus-visible:outline-none tw:motion-reduce:transition-none";
const ROW_SELECTED = "tw:bg-white/10 tw:text-sidebar-foreground";

/**
 * Authorized navigation as a landmark list: links for pages, disclosure buttons
 * for groups. Permission filtering happens upstream
 * (useRoleAwareAdminNavigation); this component never grants, only renders.
 * When `collapsed`, groups flatten to icon-only links named by their label.
 */
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
  const [openKeys, setOpenKeys] = useState<string[]>(() => findOpenKeys(list, pathname));

  const toggle = (id: string) =>
    setOpenKeys((current) => (current.includes(id) ? current.filter((key) => key !== id) : [...current, id]));

  return (
    <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-0.5 tw:p-0">
      {list.map((item) =>
        item.children?.length ? (
          collapsed ? (
            item.children.map((child) => (
              <NavLink key={child.id} item={child} selected={selected.has(child.id)} collapsed onNavigate={onNavigate} />
            ))
          ) : (
            <NavGroup
              key={item.id}
              item={item}
              open={openKeys.includes(item.id)}
              selectedChild={item.children.some((child) => selected.has(child.id))}
              onToggle={() => toggle(item.id)}
            >
              {item.children.map((child) => (
                <NavLink key={child.id} item={child} selected={selected.has(child.id)} nested onNavigate={onNavigate} />
              ))}
            </NavGroup>
          )
        ) : (
          <NavLink key={item.id} item={item} selected={selected.has(item.id)} collapsed={collapsed} onNavigate={onNavigate} />
        ),
      )}
    </ul>
  );
}

function NavLink({
  item,
  selected,
  nested = false,
  collapsed = false,
  onNavigate,
}: {
  item: AdminNavItem;
  selected: boolean;
  nested?: boolean;
  collapsed?: boolean;
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
        className={cn(ROW, nested && "tw:min-h-10 tw:leading-snug", collapsed && "tw:justify-center tw:px-0", selected && ROW_SELECTED)}
      >
        {Icon ? <Icon aria-hidden="true" className="tw:size-4 tw:shrink-0" /> : null}
        {collapsed ? null : <span className="tw:min-w-0">{item.label}</span>}
      </Link>
    </li>
  );
}

function NavGroup({
  item,
  open,
  selectedChild,
  onToggle,
  children,
}: {
  item: AdminNavItem;
  open: boolean;
  selectedChild: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const Icon = ADMIN_NAV_ICONS[item.id];
  const panelId = useId();
  return (
    <li>
      {/* Raw button exception: navigation disclosure, not an action button. */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={cn(ROW, open && "tw:bg-sidebar-accent/60", selectedChild && "tw:text-sidebar-foreground")}
      >
        {Icon ? <Icon aria-hidden="true" className="tw:size-4 tw:shrink-0" /> : null}
        <span className="tw:min-w-0 tw:flex-1">{item.label}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("tw:size-4 tw:shrink-0 tw:transition-transform tw:motion-reduce:transition-none", open && "tw:rotate-180")}
        />
      </button>
      <ul id={panelId} hidden={!open} className="tw:m-0 tw:mt-0.5 tw:ml-4 tw:flex tw:list-none tw:flex-col tw:gap-0.5 tw:border-l tw:border-sidebar-border tw:p-0 tw:pl-2">
        {children}
      </ul>
    </li>
  );
}

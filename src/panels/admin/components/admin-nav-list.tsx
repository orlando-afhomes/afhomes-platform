"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  type AdminNavItem,
  getAvailableAdminNavigation,
  isAdminNavItemActive,
} from "../navigation";

export function AdminNavList({
  items,
  onNavigate,
}: {
  items?: AdminNavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const entries = getAvailableAdminNavigation(items);

  return (
    <nav aria-label="Administration" className="flex flex-col gap-1">
      {entries.map((item) => {
        const active = isAdminNavItemActive(item, pathname);
        const hasChildren = (item.children?.length ?? 0) > 0;

        if (hasChildren) {
          return (
            <div key={item.id} className="space-y-1">
              <span className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
                {item.label}
              </span>
              <div className="ml-2 space-y-1">
                {item.children!.map((child) => {
                  const childActive = isAdminNavItemActive(child, pathname);
                  return (
                    <Link
                      key={child.id}
                      href={child.href}
                      onClick={onNavigate}
                      aria-current={childActive ? "page" : undefined}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent",
                        childActive && "bg-sidebar-accent text-foreground",
                      )}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        }

        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent",
              active && "bg-sidebar-accent text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

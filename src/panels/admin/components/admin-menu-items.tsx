import Link from "next/link";
import type { MenuProps } from "antd";
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Users,
  Network,
  BadgeCheck,
  Contact,
  Gem,
  ShoppingCart,
  Wallet,
  Percent,
  IdCard,
  Coins,
  BarChart3,
  ScrollText,
  KeyRound,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import type { AdminNavItem } from "../navigation";
import { normalizePath } from "../navigation";

const ICONS: Partial<Record<AdminNavItem["id"], LucideIcon>> = {
  dashboard: LayoutDashboard,
  organization: Building2,
  departments: Briefcase,
  roles: KeyRound,
  staff: UserCog,
  accounts: Users,
  "sales-network": Network,
  accreditation: BadgeCheck,
  customers: Contact,
  "vip-products": Gem,
  sales: ShoppingCart,
  finance: Wallet,
  commissions: Percent,
  membership: IdCard,
  "stay-points": Coins,
  reports: BarChart3,
  "audit-logs": ScrollText,
};

// Converts authorized navigation records into Ant Design menu items.
// Permission filtering happens upstream (getRoleAwareAdminNavigation);
// this adapter never grants, only renders.
export function toAntdMenuItems(
  items: AdminNavItem[],
  onNavigate?: () => void,
): MenuProps["items"] {
  return items.map((item) => {
    const Icon = ICONS[item.id];
    const label = (
      <Link href={item.href} onClick={onNavigate}>
        {item.label}
      </Link>
    );
    if (item.children?.length) {
      return {
        key: item.id,
        icon: Icon ? <Icon className="size-4" /> : null,
        label: item.label,
        children: toAntdMenuItems(item.children, onNavigate),
      };
    }
    return {
      key: item.id,
      icon: Icon ? <Icon className="size-4" /> : null,
      label,
    };
  });
}

// Precise route matching for menu selection. Exact matches win; otherwise the
// longest href that is a path-segment parent wins. The dashboard root (/admin)
// is never a prefix parent: it selects only on exact "/admin", so unknown
// routes do not highlight Dashboard as a fallback.
type RouteMatch = { item: AdminNavItem; ancestors: AdminNavItem[] };

function findRouteMatch(
  entries: AdminNavItem[],
  current: string,
  ancestors: AdminNavItem[] = [],
): RouteMatch | null {
  let best: RouteMatch | null = null;
  let bestLength = -1;
  const consider = (item: AdminNavItem, itemAncestors: AdminNavItem[], hrefLength: number, exact: boolean) => {
    if (exact) {
      best = { item, ancestors: itemAncestors };
      bestLength = Number.MAX_SAFE_INTEGER;
    } else if (hrefLength > bestLength) {
      best = { item, ancestors: itemAncestors };
      bestLength = hrefLength;
    }
  };

  for (const item of entries) {
    const href = normalizePath(item.href);
    if (current === href) {
      consider(item, ancestors, Number.MAX_SAFE_INTEGER, true);
      continue;
    }
    // Segment-boundary prefix only; dashboard root excluded as a fallback.
    if (href !== "/admin" && current.startsWith(`${href}/`)) {
      consider(item, ancestors, href.length, false);
    }
    if (item.children?.length) {
      const child = findRouteMatch(item.children, current, [...ancestors, item]);
      if (child) {
        const childHref = normalizePath(child.item.href);
        if (childHref.length > bestLength) {
          best = child;
          bestLength = childHref.length;
        }
      }
    }
  }
  return best;
}

// Selected menu keys reflect the current pathname. Unknown routes select
// nothing; selection comes only from authorized items passed by the caller.
export function findSelectedKeys(items: AdminNavItem[], pathname: string | null): string[] {
  if (pathname == null) return [];
  const match = findRouteMatch(items, normalizePath(pathname));
  return match ? [match.item.id] : [];
}

// Parent groups of the matched route, for controlled openKeys. Unknown
// routes expand nothing.
export function findOpenKeys(items: AdminNavItem[], pathname: string | null): string[] {
  if (pathname == null) return [];
  const match = findRouteMatch(items, normalizePath(pathname));
  return match ? match.ancestors.map((item) => item.id) : [];
}

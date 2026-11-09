import type { AdminNavItem } from "../navigation";
import { normalizePath } from "../navigation";

// Precise route matching for navigation selection. Exact matches win; otherwise the
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

// Selected item ids reflect the current pathname. Unknown routes select
// nothing; selection comes only from authorized items passed by the caller.
export function findSelectedKeys(items: AdminNavItem[], pathname: string | null): string[] {
  if (pathname == null) return [];
  const match = findRouteMatch(items, normalizePath(pathname));
  return match ? [match.item.id] : [];
}

// Parent groups of the matched route, used as the initially expanded groups.
// Unknown routes expand nothing.
export function findOpenKeys(items: AdminNavItem[], pathname: string | null): string[] {
  if (pathname == null) return [];
  const match = findRouteMatch(items, normalizePath(pathname));
  return match ? match.ancestors.map((item) => item.id) : [];
}

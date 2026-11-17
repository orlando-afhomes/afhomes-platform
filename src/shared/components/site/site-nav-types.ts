import type { ReactNode } from "react";

/** One link in a site menu. `imageSrc` adds a thumbnail in the dropdown and phone menu. */
export type SiteNavLink = { href: string; label: string; description?: string; imageSrc?: string };

/** A menu entry that opens a panel of links (for example "Experiences"). */
export type SiteNavGroup = { label: string; children: SiteNavLink[] };

export type SiteNavItem = SiteNavLink | SiteNavGroup;

export type SiteHeaderAction = {
  href: string;
  label: string;
  variant: "primary" | "outline";
  /** A React element, not a component: it can cross from server to client components. */
  icon?: ReactNode;
};

export function isNavGroup(item: SiteNavItem): item is SiteNavGroup {
  return "children" in item;
}

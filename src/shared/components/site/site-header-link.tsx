"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveNavHref, type SiteNavLink } from "./site-nav-types";

/** Top-level header link. Pass `active` from a route that already knows the current page. */
export function SiteHeaderLink({ link, active = false }: { link: SiteNavLink; active?: boolean }) {
  return (
    <Link href={link.href} className="site-header__link" aria-current={active ? "page" : undefined}>
      {link.label}
    </Link>
  );
}

/** Top-level header link that reads the pathname to mark the current page. */
export function ActiveSiteHeaderLink({ link }: { link: SiteNavLink }) {
  const pathname = usePathname();
  return <SiteHeaderLink link={link} active={isActiveNavHref(pathname, link.href)} />;
}

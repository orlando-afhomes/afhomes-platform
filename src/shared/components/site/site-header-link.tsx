"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveNavHref, type SiteNavLink } from "./site-nav-types";

/** Top-level header link that marks itself as the current page for the active route. */
export function SiteHeaderLink({ link }: { link: SiteNavLink }) {
  const pathname = usePathname();
  const active = isActiveNavHref(pathname, link.href);

  return (
    <Link href={link.href} className="site-header__link" aria-current={active ? "page" : undefined}>
      {link.label}
    </Link>
  );
}

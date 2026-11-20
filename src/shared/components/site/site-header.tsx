import Image from "next/image";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";
import { SiteHeaderFrame } from "./site-header-frame";
import { ActiveSiteHeaderLink, SiteHeaderLink } from "./site-header-link";
import { SiteHeaderScroll } from "./site-header-scroll";
import { SiteMobileMenu } from "./site-mobile-menu";
import { ActiveSiteNavDropdown, SiteNavDropdown } from "./site-nav-dropdown";
import { isNavGroup, type SiteHeaderAction, type SiteNavItem, type SiteNavLink } from "./site-nav-types";

export type SiteHeaderProps = {
  brand: { name: string; subName?: string; href: string; logoSrc: string };
  items: SiteNavItem[];
  actions: SiteHeaderAction[];
  /** Extra small links at the bottom of the phone menu, such as a staff sign-in. */
  mobileExtraLinks?: SiteNavLink[];
  /** Route marker set by the owning layout, such as "verify" for the solid header. */
  page?: string;
  /** Mark the current page in the menu. Turn it off where the route's params are unknown at build time. */
  trackActive?: boolean;
  className?: string;
};

/** Sticky site header: brand, main menu with optional dropdown groups, action buttons, and a phone menu. */
export function SiteHeader({ brand, items, actions, mobileExtraLinks = [], page, trackActive = true, className }: SiteHeaderProps) {
  return (
    <SiteHeaderFrame className={cn("site-header", className)} page={page}>
      <SiteHeaderScroll />
      <div className="site-header__bar">
        <Link href={brand.href} className="site-header__brand" aria-label={`${brand.name}${brand.subName ? ` ${brand.subName}` : ""} home`}>
          <span className="site-header__logo" aria-hidden="true">
            <Image src={brand.logoSrc} alt="" width={28} height={32} priority className="site-header__logo-image" />
          </span>
          <span className="site-header__name">
            <span className="site-header__name-main">{brand.name}</span>
            {brand.subName ? <span className="site-header__name-sub">{brand.subName}</span> : null}
          </span>
        </Link>

        <nav className="site-header__nav" aria-label="Public">
          {items.map((item) =>
            isNavGroup(item) ? (
              trackActive ? <ActiveSiteNavDropdown key={item.label} group={item} /> : <SiteNavDropdown key={item.label} group={item} />
            ) : trackActive ? (
              <ActiveSiteHeaderLink key={item.href} link={item} />
            ) : (
              <SiteHeaderLink key={item.href} link={item} />
            ),
          )}
        </nav>

        <div className="site-header__actions">
          {actions.map((action) => (
            <Link key={action.href} href={action.href} className={`site-header__action site-header__action--${action.variant}`}>
              {action.icon}
              {action.label}
            </Link>
          ))}
        </div>

        <SiteMobileMenu brandName={brand.name} brandSubName={brand.subName} logoSrc={brand.logoSrc} items={items} actions={actions} extraLinks={mobileExtraLinks} />
      </div>
    </SiteHeaderFrame>
  );
}

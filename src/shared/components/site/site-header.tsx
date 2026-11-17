import Image from "next/image";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";
import { SiteMobileMenu } from "./site-mobile-menu";
import { SiteNavDropdown } from "./site-nav-dropdown";
import { isNavGroup, type SiteHeaderAction, type SiteNavItem, type SiteNavLink } from "./site-nav-types";

export type SiteHeaderProps = {
  brand: { name: string; href: string; logoSrc: string };
  items: SiteNavItem[];
  actions: SiteHeaderAction[];
  /** Extra small links at the bottom of the phone menu, such as a staff sign-in. */
  mobileExtraLinks?: SiteNavLink[];
  className?: string;
};

/** Sticky site header: brand, main menu with optional dropdown groups, action buttons, and a phone menu. */
export function SiteHeader({ brand, items, actions, mobileExtraLinks = [], className }: SiteHeaderProps) {
  return (
    <header className={cn("site-header", className)}>
      <div className="site-header__bar">
        <Link href={brand.href} className="site-header__brand" aria-label={`${brand.name} home`}>
          <span className="site-header__logo" aria-hidden="true">
            <Image src={brand.logoSrc} alt="" width={28} height={32} priority className="site-header__logo-image" />
          </span>
          <span className="site-header__name">{brand.name}</span>
        </Link>

        <nav className="site-header__nav" aria-label="Public">
          {items.map((item) =>
            isNavGroup(item) ? (
              <SiteNavDropdown key={item.label} group={item} />
            ) : (
              <Link key={item.href} href={item.href} className="site-header__link">{item.label}</Link>
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

        <SiteMobileMenu brandName={brand.name} items={items} actions={actions} extraLinks={mobileExtraLinks} />
      </div>
    </header>
  );
}

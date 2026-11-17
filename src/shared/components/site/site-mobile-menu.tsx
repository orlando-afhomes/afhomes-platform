"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Menu } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { isNavGroup, type SiteHeaderAction, type SiteNavItem, type SiteNavLink } from "./site-nav-types";

type SiteMobileMenuProps = {
  brandName: string;
  items: SiteNavItem[];
  actions: SiteHeaderAction[];
  extraLinks: SiteNavLink[];
};

/** Phone and tablet menu for the site header. Closes when a link is chosen. */
export function SiteMobileMenu({ brandName, items, actions, extraLinks }: SiteMobileMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button type="button" variant="outline" size="icon" aria-label="Open menu" className="site-header__menu-button" />}>
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="right" className="site-mobile-menu">
        <SheetHeader className="site-mobile-menu__header">
          <SheetTitle>{brandName}</SheetTitle>
          <SheetDescription className="tw:sr-only">Site menu</SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobile" className="site-mobile-menu__nav">
          {items.map((item) =>
            isNavGroup(item) ? (
              <div key={item.label} className="site-mobile-menu__group">
                <p className="site-mobile-menu__group-label">{item.label}</p>
                {item.children.map((link) => (
                  <MobileLink key={link.href} link={link} onNavigate={close} nested />
                ))}
              </div>
            ) : (
              <MobileLink key={item.href} link={item} onNavigate={close} />
            ),
          )}
        </nav>
        <div className="site-mobile-menu__actions">
          {actions.map((action) => (
            <Link key={action.href} href={action.href} onClick={close} className={`site-header__action site-header__action--${action.variant} site-header__action--block`}>
              {action.icon}
              {action.label}
            </Link>
          ))}
          {extraLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={close} className="site-mobile-menu__small-link">
              {link.label}
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileLink({ link, onNavigate, nested = false }: { link: SiteNavLink; onNavigate: () => void; nested?: boolean }) {
  return (
    <Link href={link.href} onClick={onNavigate} className={nested ? "site-mobile-menu__link site-mobile-menu__link--nested" : "site-mobile-menu__link"}>
      {link.imageSrc ? (
        <span className="site-mobile-menu__thumb">
          <Image src={link.imageSrc} alt="" width={56} height={42} sizes="56px" className="site-header__panel-image" />
        </span>
      ) : null}
      <span className="site-mobile-menu__label">{link.label}</span>
      <ChevronRight aria-hidden="true" className="site-mobile-menu__chevron" />
    </Link>
  );
}

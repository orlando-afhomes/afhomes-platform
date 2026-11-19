"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Briefcase, ChevronDown, ChevronRight, Info, Menu, UserRound, X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { isNavGroup, type SiteHeaderAction, type SiteNavItem, type SiteNavLink } from "./site-nav-types";

type SiteMobileMenuProps = {
  brandName: string;
  brandSubName?: string;
  logoSrc: string;
  items: SiteNavItem[];
  actions: SiteHeaderAction[];
  extraLinks: SiteNavLink[];
};

/** Phone and tablet menu for the site header. Closes when a link is chosen. */
export function SiteMobileMenu({ brandName, brandSubName, logoSrc, items, actions, extraLinks }: SiteMobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const close = () => { setOpen(false); setAccessOpen(false); };
  const changeOpen = (next: boolean) => { setOpen(next); if (!next) setAccessOpen(false); };
  const fullName = brandSubName ? `${brandName} ${brandSubName}` : brandName;

  return (
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetTrigger render={<button type="button" aria-label="Open menu" className="site-header__menu-button" />}>
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="right" className="site-mobile-menu" showCloseButton={false}>
        <SheetHeader className="site-mobile-menu__header">
          <SheetTitle className="tw:sr-only">{fullName} menu</SheetTitle>
          <SheetDescription className="tw:sr-only">Site menu</SheetDescription>
          <div className="site-mobile-menu__brand">
            <span className="site-mobile-menu__logo" aria-hidden="true">
              <Image src={logoSrc} alt="" width={32} height={36} sizes="46px" className="site-mobile-menu__logo-image" />
            </span>
            <span className="site-mobile-menu__brand-text">
              <span className="site-mobile-menu__brand-name">{brandName}</span>
              {brandSubName ? <span className="site-mobile-menu__brand-sub">{brandSubName}</span> : null}
            </span>
          </div>
          <SheetClose render={<button type="button" aria-label="Close menu" className="site-mobile-menu__close" />}>
            <X aria-hidden="true" />
          </SheetClose>
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
          {extraLinks.length ? (
            <div className="site-mobile-menu__access">
              <button
                type="button"
                className="site-mobile-menu__access-toggle"
                aria-expanded={accessOpen}
                aria-controls="site-mobile-menu-access"
                onClick={() => setAccessOpen((value) => !value)}
              >
                <span className="site-mobile-menu__access-label">Access</span>
                <span className="site-mobile-menu__access-hint">Staff &amp; sellers</span>
                <ChevronDown aria-hidden="true" className="site-mobile-menu__access-toggle-chevron" />
              </button>
              <div id="site-mobile-menu-access" className="site-mobile-menu__access-panel" hidden={!accessOpen}>
                <div className="site-mobile-menu__access-links">
                  {extraLinks.map((link) => (
                    <Link key={link.href} href={link.href} onClick={close} className="site-mobile-menu__access-link">
                      <span className="site-mobile-menu__access-icon" aria-hidden="true">
                        {link.href === "/login/sales" ? <Briefcase /> : <UserRound />}
                      </span>
                      <span className="site-mobile-menu__access-text">{link.label}</span>
                      <ChevronRight aria-hidden="true" className="site-mobile-menu__access-chevron" />
                    </Link>
                  ))}
                </div>
                <p className="site-mobile-menu__access-note"><Info aria-hidden="true" />For staff and sellers only — not for customers.</p>
              </div>
            </div>
          ) : null}
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

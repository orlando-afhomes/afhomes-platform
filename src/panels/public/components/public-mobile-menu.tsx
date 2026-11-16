"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { ACTION_LINKS, EXPERIENCE_LINKS, MAIN_NAV } from "@/modules/public-site/content/site";
import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";

/** Phone and tablet menu of the public site. Closes when a link is chosen. */
export function PublicMobileMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button type="button" variant="outline" size="icon" aria-label="Open menu" className="site-header__menu-button" />}>
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="right" className="site-mobile-menu">
        <SheetHeader>
          <SheetTitle>AFhomes</SheetTitle>
          <SheetDescription className="tw:sr-only">Site menu</SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobile" className="site-mobile-menu__nav">
          {MAIN_NAV.slice(0, 2).map((link) => (
            <Link key={link.href} href={link.href} onClick={close} className="site-mobile-menu__link">{link.label}</Link>
          ))}
          <p className="site-mobile-menu__group">Experiences</p>
          {EXPERIENCE_LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={close} className="site-mobile-menu__link site-mobile-menu__link--nested">{link.label}</Link>
          ))}
          {MAIN_NAV.slice(2).map((link) => (
            <Link key={link.href} href={link.href} onClick={close} className="site-mobile-menu__link">{link.label}</Link>
          ))}
        </nav>
        <div className="site-mobile-menu__actions">
          {ACTION_LINKS.map((link, index) => (
            <Link key={link.href} href={link.href} onClick={close} className={index === 0 ? "site-button site-button--primary" : "site-button site-button--outline"}>{link.label}</Link>
          ))}
          <Link href="/login" onClick={close} className="site-mobile-menu__small-link">Staff Login</Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

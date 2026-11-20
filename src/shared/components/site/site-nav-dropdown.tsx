"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";
import { isActiveNavHref, type SiteNavGroup } from "./site-nav-types";

/** Header menu that opens a panel of links on click or keyboard. Escape or a link click closes it. */
export function SiteNavDropdown({ group, active = false }: { group: SiteNavGroup; active?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-current={active ? "true" : undefined}
        className={cn("site-header__link site-header__dropdown-button", group.triggerClassName)}
      >
        {group.label}
        <ChevronDown aria-hidden="true" className="site-header__chevron" />
      </PopoverTrigger>
      {open ? (
        <PopoverContent align="start" sideOffset={10} className="site-header__panel">
          {group.children.map((link) => (
            <Link key={link.href} href={link.href} className="site-header__panel-link" onClick={() => setOpen(false)}>
              {link.imageSrc ? (
                <span className="site-header__panel-thumb">
                  <Image src={link.imageSrc} alt="" width={84} height={64} sizes="84px" className="site-header__panel-image" />
                </span>
              ) : null}
              <span className="site-header__panel-copy">
                <span className="site-header__panel-title">{link.label}</span>
                {link.description ? <span className="site-header__panel-text">{link.description}</span> : null}
              </span>
            </Link>
          ))}
        </PopoverContent>
      ) : null}
    </Popover>
  );
}

/** Dropdown that reads the pathname to mark a group when one of its pages is current. */
export function ActiveSiteNavDropdown({ group }: { group: SiteNavGroup }) {
  const pathname = usePathname();
  const active = group.children.some((link) => isActiveNavHref(pathname, link.href));
  return <SiteNavDropdown group={group} active={active} />;
}

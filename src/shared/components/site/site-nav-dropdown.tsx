"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import type { SiteNavGroup } from "./site-nav-types";

/** Header menu that opens a panel of links on hover, click, or keyboard. Escape closes it. */
export function SiteNavDropdown({ group }: { group: SiteNavGroup }) {
  return (
    <Popover>
      <PopoverTrigger className="site-header__link site-header__dropdown-button">
        {group.label}
        <ChevronDown aria-hidden="true" className="site-header__chevron" />
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={10} className="site-header__panel">
        {group.children.map((link) => (
          <Link key={link.href} href={link.href} className="site-header__panel-link">
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
    </Popover>
  );
}

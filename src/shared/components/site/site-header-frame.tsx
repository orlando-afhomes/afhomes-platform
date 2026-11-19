"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Renders the site header element and marks the one route whose header must use the solid style.
 * The Verify page sits on a light background, unlike the home and contact heroes, so it opts out of
 * the transparent header rules. The marker is on the header itself, so it is server-rendered.
 */
export function SiteHeaderFrame({ className, children }: { className?: string; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <header className={className} data-page={pathname === "/verify" ? "verify" : undefined}>
      {children}
    </header>
  );
}

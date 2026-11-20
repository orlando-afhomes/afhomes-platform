import type { ReactNode } from "react";

/**
 * Renders the site header element and applies the route marker that lets page CSS pick a solid header.
 * The value comes from the layout that owns the route, so prerendering needs no client hook or pathname check.
 */
export function SiteHeaderFrame({ className, page, children }: { className?: string; page?: string; children: ReactNode }) {
  return (
    <header className={className} data-page={page}>
      {children}
    </header>
  );
}

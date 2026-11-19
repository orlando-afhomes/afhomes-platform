"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Info } from "lucide-react";
import type { SiteNavLink } from "./site-nav-types";

/** Footer Access column. A button expands the links with a measured max-height transition. */
export function SiteFooterAccess({ heading, links }: { heading: string; links: SiteNavLink[] }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const sync = () => panel.style.setProperty("--access-panel-height", `${panel.scrollHeight}px`);
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [open]);

  function toggle() {
    const panel = panelRef.current;
    if (!panel) return;
    const next = !open;
    if (next) panel.style.setProperty("--access-panel-height", `${panel.scrollHeight}px`);
    setOpen(next);
  }

  return (
    <div className="site-footer__block site-footer__access">
      <button
        type="button"
        className="site-footer__heading site-footer__access-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        {heading}
        <ChevronDown aria-hidden="true" className="site-footer__access-chevron" />
      </button>
      <div id={panelId} ref={panelRef} className="site-footer__access-panel" data-open={open} inert={!open}>
        <div className="site-footer__access-body">
          <nav aria-label={heading} className="site-footer__access-nav">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="site-footer__link">{link.label}</Link>
            ))}
            <p className="site-footer__access-note"><Info aria-hidden="true" />Staff and sellers only.</p>
          </nav>
        </div>
      </div>
    </div>
  );
}

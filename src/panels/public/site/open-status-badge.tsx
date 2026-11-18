"use client";

import { useEffect, useState } from "react";
import { SiteBadge } from "@/shared/components/site";
import { isSiteOpenAt } from "@/modules/public-site/hours";

/**
 * Live office status for the Home hero.
 * Starts hidden so the server-rendered page cannot show a stale time, then updates every 30 seconds.
 */
export function OpenStatusBadge() {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setOpen(isSiteOpenAt(new Date()));
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const pending = open === null;

  return (
    <span
      className={pending ? "site-home-hero__open site-home-hero__open--pending" : "site-home-hero__open"}
      aria-hidden={pending || undefined}
    >
      <SiteBadge tone={open === false ? "neutral" : "live"}>{open === false ? "Closed now" : "Open now"}</SiteBadge>
    </span>
  );
}

"use client";

import { useEffect, useRef } from "react";

/**
 * Marks the surrounding <header> with data-scrolled once the page has moved past `threshold` pixels.
 * Styles use that attribute to ease between two looks with a normal CSS transition.
 */
export function SiteHeaderScroll({ threshold = 24 }: { threshold?: number }) {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const header = marker.current?.closest("header");
    if (!header) return;
    const update = () => header.toggleAttribute("data-scrolled", window.scrollY > threshold);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);

  return <span ref={marker} hidden />;
}

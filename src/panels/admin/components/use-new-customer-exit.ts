"use client";

import { useCallback, useEffect, useState } from "react";

export function useNewCustomerExit({
  enabled,
  dirty,
  busy,
  navigate,
}: {
  enabled: boolean;
  dirty: boolean;
  busy: boolean;
  navigate: (href: string) => void;
}) {
  const [destination, setDestination] = useState<(() => void) | null>(null);

  const requestExit = useCallback((leave: () => void) => {
    if (enabled && busy) return;
    if (enabled && dirty) setDestination((current) => current ?? leave);
    else leave();
  }, [enabled, dirty, busy]);

  useEffect(() => {
    if (!enabled || (!dirty && !busy)) return;
    function interceptLink(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.hasAttribute("download") || (link.target && link.target.toLowerCase() !== "_self")) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      event.preventDefault();
      requestExit(() => navigate(url.pathname + url.search + url.hash));
    }

    function warnOnUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }

    document.addEventListener("click", interceptLink, true);
    window.addEventListener("beforeunload", warnOnUnload);
    return () => {
      document.removeEventListener("click", interceptLink, true);
      window.removeEventListener("beforeunload", warnOnUnload);
    };
  }, [enabled, dirty, busy, navigate, requestExit]);

  return { destination, requestExit, dismiss: () => setDestination(null) };
}

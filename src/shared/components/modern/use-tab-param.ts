"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Keeps the selected tab in the URL query (`?tab=` by default) so links,
 * refresh and Back land on the same tab.
 *
 * - `allowed` lists the tab values the current user may open, in display order.
 * - The active tab is the URL value when it is allowed, otherwise the first
 *   allowed tab (a missing, unknown or forbidden `?tab=` never shows a hidden tab).
 *   It is `undefined` only when `allowed` is empty.
 * - A `?tab=` that is present but unknown or not allowed is rewritten in the
 *   address bar to the active fallback with `history.replaceState` (no history
 *   entry, other query parameters kept), so the URL never misdescribes the view.
 * - `select` updates the URL with `history.replaceState` (no extra history
 *   entries); other query parameters are kept, and changing tabs also removes
 *   `view`, which belongs to the Staff directory and must not leak across tabs.
 * - The router can keep a page mounted while its URL changes, so the hook
 *   follows the URL whenever it changes, not only on first render.
 *
 * Uses `useSearchParams`, so the route page must render the component inside
 * `<Suspense>` (see `src/app/admin/organization/staff/page.tsx`).
 */
export function useTabParam<T extends string>(
  allowed: readonly T[],
  param = "tab",
): readonly [active: T | undefined, select: (value: T) => void] {
  const fromUrl = useSearchParams()?.get(param) ?? null;
  const [selected, setSelected] = useState<string | null>(fromUrl);
  const [seenUrl, setSeenUrl] = useState(fromUrl);
  if (seenUrl !== fromUrl) {
    setSeenUrl(fromUrl);
    setSelected(fromUrl);
  }

  const active = selected !== null && (allowed as readonly string[]).includes(selected) ? (selected as T) : allowed[0];

  const select = useCallback(
    (value: T) => {
      setSelected(value);
      const url = new URL(window.location.href);
      url.searchParams.set(param, value);
      // `view` is the Staff directory sub-view; it must not survive a tab change.
      if (value !== active) url.searchParams.delete("view");
      window.history.replaceState(null, "", url);
    },
    [active, param],
  );

  useEffect(() => {
    if (active === undefined || fromUrl === null || fromUrl === active) return;
    const url = new URL(window.location.href);
    // Read the live URL: once it names the active tab there is nothing left to
    // fix, so a stale `useSearchParams` value cannot re-run this forever.
    if (url.searchParams.get(param) === active) return;
    url.searchParams.set(param, active);
    window.history.replaceState(null, "", url);
  }, [active, fromUrl, param]);

  return [active, select] as const;
}

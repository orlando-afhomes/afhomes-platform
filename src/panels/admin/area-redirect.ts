import { redirect } from "next/navigation";
import { adminAreaHref, type AdminAreaKey, type AdminAreaTabValue } from "./navigation";

/** Next.js route `searchParams` (already awaited). */
export type RouteSearchParams = Record<string, string | string[] | undefined>;

/** Props of a former route page that only redirects. */
export type AreaRedirectPageProps = { searchParams: Promise<RouteSearchParams> };

/**
 * `/admin/<area>?tab=<tab>` plus the former route's other query parameters
 * (an incoming `tab` is replaced). Pure, so links and tests can use it too.
 */
export function areaTabHref<A extends AdminAreaKey>(area: A, tab: AdminAreaTabValue<A>, searchParams: RouteSearchParams = {}): string {
  const query = new URLSearchParams({ tab });
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "tab" || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
  }
  return `${adminAreaHref(area)}?${query.toString()}`;
}

/**
 * Server redirect for a former route that became a tab (owner ruling
 * 2026-11-15: old links still open the right tab). Keeps the route file and
 * its query string; `[id]` detail routes stay real pages. Usage in
 * `src/app/admin/promos/page.tsx`:
 *
 * ```tsx
 * import { redirectToAreaTab, type AreaRedirectPageProps } from "@/panels/admin/area-redirect";
 *
 * // The admin shell authenticates client-side, so segments are not validated at instant-navigation time.
 * export const instant = false;
 *
 * export default async function Page({ searchParams }: AreaRedirectPageProps) {
 *   return redirectToAreaTab("stay-points", "promos", searchParams);
 * }
 * ```
 *
 * The target area page checks access itself, so the redirect grants nothing.
 */
export async function redirectToAreaTab<A extends AdminAreaKey>(
  area: A,
  tab: AdminAreaTabValue<A>,
  searchParams?: Promise<RouteSearchParams> | RouteSearchParams,
): Promise<never> {
  redirect(areaTabHref(area, tab, (await searchParams) ?? {}));
}

/** Earlier contract-review links open the same Contracts list with the review filter. */
export async function redirectToContractsReview(searchParams: AreaRedirectPageProps["searchParams"] | RouteSearchParams): Promise<never> {
  const query = await searchParams;
  return redirectToAreaTab("sales", "contracts", { ...query, status: query.status ?? "needs-review" });
}

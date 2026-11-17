"use client";

import { useId, type ReactNode } from "react";
import type { AdminModuleId } from "@/modules/identity/permissions";
import type { BreadcrumbItem } from "@/shared/components/modern/breadcrumbs";
import { TabBar, tabId, tabPanelId, type TabBarTab } from "@/shared/components/modern/tab-bar";
import { useTabParam } from "@/shared/components/modern/use-tab-param";
import { useNotifications } from "@/shared/providers/notifications-provider";
import { AdminPage } from "./admin-page";

export type AreaPageTab = {
  /** The `?tab=` value; keep it identical to `ADMIN_AREA_TABS` in `src/panels/admin/navigation.ts`. */
  value: string;
  label: string;
  /**
   * Whether the current user may open this tab. Required and fail-closed: only an
   * explicit `true` renders the tab; a hidden tab is never rendered. In the admin
   * panel pass `useAdminAreaTabAccess(area)[value]` so tabs follow the sidebar rules.
   */
  allowed: boolean;
  /** Optional count shown beside the label. */
  count?: number;
  icon?: TabBarTab["Icon"];
  /** The tab panel content; only the active tab is rendered. `select` opens another tab (e.g. a summary card drilling down). */
  render: (select: (value: string) => void) => ReactNode;
};

/**
 * One page per area, with tabs (owner ruling 2026-11-15). Renders `AdminPage`
 * (title and actions, no description), a `TabBar` of the allowed tabs, and the
 * active tab's panel (`role="tabpanel"`, linked with `aria-labelledby`).
 *
 * - The active tab lives in the URL (`?tab=`, or `param`) through `useTabParam`;
 *   a missing, unknown or not-allowed value falls back to the first allowed tab,
 *   and the address bar is corrected to the tab actually shown.
 * - Gate every tab with `allowed` (required, fail-closed: only `true` renders);
 *   in the admin panel use `useAdminAreaTabAccess(area)`
 *   (`src/panels/admin/use-role-aware-navigation.ts`) so tabs follow the same
 *   rules as the sidebar.
 * - The tab bar follows the declared tabs: an area declaring more than one tab
 *   always shows the bar, even when only one is allowed, so a restricted user can
 *   still tell which sub-view is open. An area with a single declared tab renders
 *   its panel alone. No allowed tab (or no `anyOf` grant): `AdminPage`'s 403 view.
 * - `actions` may be a function of the active tab value, for per-tab buttons.
 * - `crumbs` defaults to the title plus the active tab's label.
 *
 * The route page must wrap this in `<Suspense>` because `useTabParam` uses
 * `useSearchParams`, and keep `export const instant = false;`, for example:
 *
 * ```tsx
 * export const instant = false;
 * export default function Page() {
 *   return (
 *     <Suspense>
 *       <FinanceAreaPage />
 *     </Suspense>
 *   );
 * }
 * ```
 */
export function AreaPage({
  anyOf,
  title,
  crumbs,
  actions,
  tabs,
  param = "tab",
}: {
  anyOf: readonly AdminModuleId[];
  title: string;
  crumbs?: BreadcrumbItem[];
  actions?: ReactNode | ((activeTab: string) => ReactNode);
  tabs: readonly AreaPageTab[];
  param?: string;
}) {
  const idPrefix = useId();
  const { unreadByTab } = useNotifications();
  const visible = tabs.filter((tab) => tab.allowed === true);
  const [activeValue, select] = useTabParam(
    visible.map((tab) => tab.value),
    param,
  );
  const active = visible.find((tab) => tab.value === activeValue);
  // Declared tabs, not allowed tabs: a restricted user still sees which sub-view is open.
  const showTabBar = tabs.length > 1;
  const pageCrumbs = crumbs ?? (active && showTabBar ? [{ label: title }, { label: active.label }] : [{ label: title }]);

  return (
    <AdminPage
      anyOf={anyOf}
      title={title}
      crumbs={pageCrumbs}
      allowed={active !== undefined}
      actions={typeof actions === "function" ? (active ? actions(active.value) : null) : actions}
    >
      {active ? (
        showTabBar ? (
          <>
            <TabBar
              label={title}
              idPrefix={idPrefix}
              tabs={visible.map(({ value, label, count, icon }) => ({ value, label, count, Icon: icon, unreadCount: unreadByTab[value] }))}
              value={active.value}
              onChange={select}
            />
            {visible.map((tab) => (
              <div
                key={tab.value}
                role="tabpanel"
                id={tabPanelId(idPrefix, tab.value)}
                aria-labelledby={tabId(idPrefix, tab.value)}
                hidden={tab !== active}
              >
                {tab === active ? <div className="tw:flex tw:flex-col tw:gap-6">{active.render(select)}</div> : null}
              </div>
            ))}
          </>
        ) : (
          active.render(select)
        )
      ) : null}
    </AdminPage>
  );
}

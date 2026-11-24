"use client";

import { useId, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { TAB_ICONS } from "./tab-icons";

export type TabBarTab = { value: string; label: string; Icon?: LucideIcon; count?: number; unreadCount?: number };

/** Id of the tab button for `value` (pair with `tabPanelId` on the panel's aria-labelledby). */
export function tabId(idPrefix: string, value: string) {
  return `${idPrefix}-tab-${value}`;
}

/** Id of the panel for `value` (the tab's aria-controls). */
export function tabPanelId(idPrefix: string, value: string) {
  return `${idPrefix}-panel-${value}`;
}

/**
 * Simple tab bar (WAI-ARIA tabs, buttons only; panels are rendered by the caller).
 * Keyboard: Arrow Left/Right move and select (wrapping), Home/End jump to the
 * first/last tab; only the selected tab is in the Tab order (roving tabindex).
 * On narrow screens a labeled select exposes the same views and counts.
 * Pass `idPrefix` to link each tab to its panel: the tab gets id
 * `tabId(idPrefix, value)` and aria-controls `tabPanelId(idPrefix, value)`; the
 * caller gives the panel that id, role="tabpanel" and aria-labelledby.
 */
export function TabBar({
  tabs,
  value,
  onChange,
  label,
  idPrefix,
}: {
  tabs: readonly TabBarTab[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  idPrefix?: string;
}) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const unreadDescriptionId = useId();
  // Keep one tab reachable by Tab even if `value` matches none.
  const focusableIndex = Math.max(0, tabs.findIndex((tab) => tab.value === value));
  const active = tabs[focusableIndex];
  const unreadTotal = tabs.reduce((total, tab) => total + (tab.unreadCount ?? 0), 0);
  const moveTo = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    buttonRefs.current[next]?.focus();
    onChange(tabs[next].value);
  };

  if (!active) return null;

  return (
    <>
      <div className="tw:md:hidden">
        <Select value={active.value} onValueChange={(next) => { if (next) onChange(next); }}>
          <SelectTrigger
            aria-label={`${label} views`}
            aria-description={unreadTotal > 0 ? unreadLabel(unreadTotal) : undefined}
            className="tw:data-[size=default]:h-16 tw:w-full tw:gap-3.5 tw:rounded-2xl tw:border-primary/25 tw:bg-card tw:px-3.5 tw:py-2 tw:font-semibold tw:shadow-(--shadow-soft) tw:hover:border-primary/50 tw:data-popup-open:border-primary"
          >
            <ViewChip Icon={active.Icon ?? TAB_ICONS[active.value]} selected />
            <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-1 tw:text-left tw:leading-none">
              <span aria-hidden="true" className="tw:text-[11px] tw:font-medium tw:tracking-wide tw:text-muted-foreground tw:uppercase">View</span>
              <SelectValue className="tw:text-base tw:font-bold">{active.label}</SelectValue>
            </span>
            {active.count === undefined ? null : <CountBadge count={active.count} />}
            <UnreadBadge count={unreadTotal} />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="tw:rounded-2xl tw:p-2">
            <p aria-hidden="true" className="tw:px-3 tw:pt-1.5 tw:pb-2.5 tw:text-xs tw:font-medium tw:tracking-wide tw:text-muted-foreground tw:uppercase">
              Switch view · {tabs.length} views
            </p>
            {tabs.map((tab) => {
              const selected = tab.value === active.value;
              return (
                <SelectItem
                  key={tab.value}
                  value={tab.value}
                  aria-description={tab.unreadCount ? unreadLabel(tab.unreadCount) : undefined}
                  className={cn("tw:min-h-14 tw:rounded-xl tw:py-2 tw:pr-10 tw:pl-3 tw:text-sm tw:text-foreground tw:focus:bg-primary/10 tw:focus:text-primary tw:focus:**:text-primary", selected ? "tw:bg-primary/10 tw:font-bold tw:text-primary" : "tw:font-medium")}
                >
                  <span className="tw:flex tw:w-full tw:items-center tw:gap-3.5">
                    <ViewChip Icon={tab.Icon ?? TAB_ICONS[tab.value]} selected={selected} />
                    <span className="tw:flex-1 tw:text-base">{tab.label}</span>
                    {tab.count === undefined ? null : <CountBadge count={tab.count} />}
                    <UnreadBadge count={tab.unreadCount} />
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <div
        role="tablist"
        aria-label={label}
        className="tw:hidden tw:gap-1.5 tw:overflow-x-auto tw:rounded-xl tw:border tw:border-border tw:bg-muted/60 tw:p-1.5 tw:[scrollbar-width:thin] tw:md:flex"
      >
        {tabs.map((tab, index) => {
          const selected = tab.value === value;
          const Icon = tab.Icon ?? TAB_ICONS[tab.value];
          return (
            <button
              key={tab.value}
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={idPrefix ? tabId(idPrefix, tab.value) : undefined}
              aria-controls={idPrefix ? tabPanelId(idPrefix, tab.value) : undefined}
              aria-selected={selected}
              aria-describedby={tab.unreadCount ? `${unreadDescriptionId}-${tab.value}` : undefined}
              tabIndex={index === focusableIndex ? 0 : -1}
              onClick={() => onChange(tab.value)}
              onKeyDown={(event) => {
                const keys: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
                if (!(event.key in keys)) return;
                event.preventDefault();
                moveTo(keys[event.key]);
              }}
              className={cn(
                // Every tab looks like a button: a visible border and pointer cursor, a tinted hover, and a solid brand fill for the open one.
                "tw:inline-flex tw:min-h-10 tw:shrink-0 tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-lg tw:border tw:px-3.5 tw:text-sm tw:font-medium tw:whitespace-nowrap tw:transition-[background-color,border-color,color,box-shadow] tw:duration-150 tw:motion-reduce:transition-none tw:focus-visible:ring-2 tw:focus-visible:ring-ring tw:focus-visible:outline-none",
                selected
                  ? "tw:border-primary tw:bg-primary tw:font-semibold tw:text-primary-foreground tw:shadow-sm"
                  : "tw:border-border tw:bg-card tw:text-foreground/80 tw:shadow-xs tw:hover:border-primary/40 tw:hover:bg-primary/10 tw:hover:text-primary",
              )}
            >
              {Icon ? <Icon aria-hidden="true" className="tw:size-4 tw:shrink-0" /> : null}
              {tab.label}
              {tab.count === undefined ? null : <CountBadge count={tab.count} />}
              <UnreadBadge count={tab.unreadCount} />
            </button>
          );
        })}
      </div>
      {tabs.map(({ value: tabValue, unreadCount }) => unreadCount ? (
        <span key={tabValue} id={`${unreadDescriptionId}-${tabValue}`} hidden>{unreadLabel(unreadCount)}</span>
      ) : null)}
    </>
  );
}

function unreadLabel(count: number) {
  return `${count} unread ${count === 1 ? "notification" : "notifications"}`;
}

// Set inline so no hover, focus or highlight style of the dropdown row can recolor the icon of the open view.
const SELECTED_ICON = { color: "#ffffff", stroke: "#ffffff" } as const;

/** Rounded icon chip: filled brand color for the open view, soft tint for the others. */
function ViewChip({ Icon, selected = false }: { Icon?: LucideIcon; selected?: boolean }) {
  if (!Icon) return null;
  return (
    <span aria-hidden="true" className={cn("tw:flex tw:size-9 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl", selected ? "tw:bg-primary tw:text-primary-foreground!" : "tw:bg-primary/10 tw:text-primary")}>
      <Icon className="tw:size-5" style={selected ? SELECTED_ICON : undefined} />
    </span>
  );
}

function CountBadge({ count }: { count: number }) {
  return <span className="tw:rounded-full tw:bg-foreground/10 tw:px-1.5 tw:text-xs tw:tabular-nums">{count}</span>;
}

function UnreadBadge({ count = 0 }: { count?: number }) {
  if (count <= 0) return null;
  return (
    <span aria-hidden="true" className="tw:inline-flex tw:min-h-5 tw:min-w-5 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-destructive tw:px-1 tw:text-xs tw:font-bold tw:text-white tw:tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}

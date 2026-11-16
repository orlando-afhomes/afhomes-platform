"use client";

import { useId, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

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
            className="tw:h-11 tw:w-full tw:rounded-xl tw:font-semibold"
          >
            <SelectValue>{active.label}</SelectValue>
            {active.count === undefined ? null : <CountBadge count={active.count} />}
            <UnreadBadge count={unreadTotal} />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {tabs.map((tab) => (
              <SelectItem key={tab.value} value={tab.value} aria-description={tab.unreadCount ? unreadLabel(tab.unreadCount) : undefined} className="tw:min-h-11">
                {tab.label}
                {tab.count === undefined ? null : <CountBadge count={tab.count} />}
                <UnreadBadge count={tab.unreadCount} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div
        role="tablist"
        aria-label={label}
        className="tw:hidden tw:gap-1 tw:overflow-x-auto tw:rounded-xl tw:border tw:border-border tw:bg-muted/60 tw:p-1 tw:[scrollbar-width:thin] tw:md:flex"
      >
        {tabs.map((tab, index) => {
          const selected = tab.value === value;
          const Icon = tab.Icon;
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
                "tw:inline-flex tw:min-h-10 tw:shrink-0 tw:items-center tw:gap-2 tw:rounded-lg tw:border tw:px-3 tw:text-sm tw:font-medium tw:whitespace-nowrap tw:focus-visible:ring-2 tw:focus-visible:ring-ring tw:focus-visible:outline-none",
                selected ? "tw:border-border tw:bg-card tw:font-semibold tw:text-primary" : "tw:border-transparent tw:text-muted-foreground tw:hover:bg-card/70 tw:hover:text-foreground",
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

function CountBadge({ count }: { count: number }) {
  return <span className="tw:rounded-full tw:bg-muted tw:px-1.5 tw:text-xs tw:tabular-nums">{count}</span>;
}

function UnreadBadge({ count = 0 }: { count?: number }) {
  if (count <= 0) return null;
  return (
    <span aria-hidden="true" className="tw:inline-flex tw:min-h-5 tw:min-w-5 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-destructive tw:px-1 tw:text-xs tw:font-bold tw:text-white tw:tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}

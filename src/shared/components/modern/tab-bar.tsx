"use client";

import { useRef } from "react";
import { cn } from "@/shared/lib/utils";

export type TabBarTab = { value: string; label: string; count?: number };

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
 * On narrow screens the tabs scroll sideways instead of wrapping.
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
  tabs: TabBarTab[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  idPrefix?: string;
}) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Keep one tab reachable by Tab even if `value` matches none.
  const focusableIndex = Math.max(0, tabs.findIndex((tab) => tab.value === value));
  const moveTo = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    buttonRefs.current[next]?.focus();
    onChange(tabs[next].value);
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="tw:flex tw:flex-nowrap tw:gap-1 tw:overflow-x-auto tw:border-b tw:border-border tw:[scrollbar-width:thin]"
    >
      {tabs.map((tab, index) => {
        const selected = tab.value === value;
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
            tabIndex={index === focusableIndex ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => {
              const keys: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
              if (!(event.key in keys)) return;
              event.preventDefault();
              moveTo(keys[event.key]);
            }}
            className={cn(
              "tw:min-h-11 tw:shrink-0 tw:rounded-t-md tw:border-b-2 tw:px-3 tw:text-sm tw:font-medium tw:whitespace-nowrap tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none tw:sm:min-h-9",
              selected ? "tw:border-primary tw:text-foreground" : "tw:border-transparent tw:text-muted-foreground tw:hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count !== undefined ? <span className="tw:ml-1.5 tw:rounded-full tw:bg-muted tw:px-1.5 tw:text-xs">{tab.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

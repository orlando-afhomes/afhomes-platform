"use client";

import { cn } from "@/shared/lib/utils";

export type TabBarTab = { value: string; label: string; count?: number };

/** Simple tab bar (WAI-ARIA tabs, buttons only; panels are rendered by the caller). */
export function TabBar({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: TabBarTab[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="tw:flex tw:flex-wrap tw:gap-1 tw:border-b tw:border-border">
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={cn(
              "tw:min-h-11 tw:rounded-t-md tw:border-b-2 tw:px-3 tw:text-sm tw:font-medium tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none tw:sm:min-h-9",
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

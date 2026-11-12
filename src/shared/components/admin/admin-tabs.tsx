"use client";

import { useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type AdminTabItem = {
  value: string;
  label: string;
  Icon?: LucideIcon;
  count?: number;
};

/**
 * Underline tab bar with roving tabindex (Arrow/Home/End). Panels are rendered by the caller.
 * Pass `idPrefix` to link each tab to its panel: tab id `${idPrefix}-tab-${value}` and
 * aria-controls `${idPrefix}-panel-${value}`; the caller gives the panel the matching id and
 * aria-labelledby.
 */
export function AdminTabs({
  items,
  value,
  onChange,
  label,
  idPrefix,
}: {
  items: readonly AdminTabItem[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  idPrefix?: string;
}) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusTab = (index: number) => {
    const next = (index + items.length) % items.length;
    buttonRefs.current[next]?.focus();
    onChange(items[next].value);
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="admin-tabs tw:-mb-px tw:flex tw:gap-1 tw:overflow-x-auto tw:border-b tw:border-border"
    >
      {items.map((item, index) => {
        const selected = item.value === value;
        const Icon = item.Icon;
        return (
          <button
            key={item.value}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={idPrefix ? `${idPrefix}-tab-${item.value}` : undefined}
            aria-controls={idPrefix ? `${idPrefix}-panel-${item.value}` : undefined}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                focusTab(index + 1);
              } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                focusTab(index - 1);
              } else if (event.key === "Home") {
                event.preventDefault();
                focusTab(0);
              } else if (event.key === "End") {
                event.preventDefault();
                focusTab(items.length - 1);
              }
            }}
            className={cn(
              "admin-tabs__tab tw:inline-flex tw:min-h-11 tw:shrink-0 tw:items-center tw:gap-2 tw:border-b-2 tw:px-4 tw:text-sm tw:font-semibold tw:outline-none tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:motion-reduce:transition-none",
              selected
                ? "tw:border-[var(--color-brand-primary)] tw:text-[var(--color-brand-primary)]"
                : "tw:border-transparent tw:text-muted-foreground tw:hover:text-foreground",
            )}
          >
            {Icon ? <Icon aria-hidden="true" className="tw:size-4 tw:shrink-0" /> : null}
            {item.label}
            {item.count !== undefined ? (
              <span className="tw:rounded-full tw:bg-muted tw:px-1.5 tw:py-0.5 tw:text-xs tw:font-semibold tw:text-muted-foreground">
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useRef } from "react";
import { CalendarDays, CreditCard, History, Home } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export const CONTRACT_DETAIL_TABS = ["overview", "schedule", "payments", "history"] as const;
export type ContractDetailTab = (typeof CONTRACT_DETAIL_TABS)[number];

/** Underline tab bar for the contract detail page (Overview, Payment Schedule, Payments, History). */
export function ContractDetailTabs({
  value,
  onChange,
}: {
  value: ContractDetailTab;
  onChange: (value: ContractDetailTab) => void;
}) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabs = [
    { value: "overview", label: "Overview", Icon: Home },
    { value: "schedule", label: "Payment Schedule", Icon: CalendarDays },
    { value: "payments", label: "Payments", Icon: CreditCard },
    { value: "history", label: "History", Icon: History },
  ] as const;

  const focusTab = (index: number) => {
    const next = (index + CONTRACT_DETAIL_TABS.length) % CONTRACT_DETAIL_TABS.length;
    buttonRefs.current[next]?.focus();
    onChange(CONTRACT_DETAIL_TABS[next]);
  };

  return (
    <div
      role="tablist"
      aria-label="Contract detail views"
      className="contract-detail__tabs tw:-mb-px tw:flex tw:gap-1 tw:overflow-x-auto tw:border-b tw:border-border"
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
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
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
                focusTab(CONTRACT_DETAIL_TABS.length - 1);
              }
            }}
            className={cn(
              "contract-detail__tab tw:inline-flex tw:min-h-11 tw:shrink-0 tw:items-center tw:gap-2 tw:border-b-2 tw:px-4 tw:text-sm tw:font-semibold tw:outline-none tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:motion-reduce:transition-none",
              selected
                ? "tw:border-[var(--color-brand-primary)] tw:text-[var(--color-brand-primary)]"
                : "tw:border-transparent tw:text-muted-foreground tw:hover:text-foreground",
            )}
          >
            <tab.Icon aria-hidden="true" className="tw:size-4 tw:shrink-0" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

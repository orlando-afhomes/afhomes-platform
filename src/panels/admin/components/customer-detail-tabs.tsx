"use client";

import { useRef } from "react";
import { Crown, FileText, History, Home, ShoppingCart } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export const CUSTOMER_DETAIL_TABS = ["overview", "contract", "sales", "membership", "audit"] as const;
export type CustomerDetailTab = (typeof CUSTOMER_DETAIL_TABS)[number];

/** Underline tab bar for the customer detail page (Overview, Contract, Sales, Membership, Audit Log). */
export function CustomerDetailTabs({
  value,
  onChange,
}: {
  value: CustomerDetailTab;
  onChange: (value: CustomerDetailTab) => void;
}) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabs = [
    { value: "overview", label: "Overview", Icon: Home },
    { value: "contract", label: "Contract", Icon: FileText },
    { value: "sales", label: "Sales", Icon: ShoppingCart },
    { value: "membership", label: "Membership", Icon: Crown },
    { value: "audit", label: "Audit Log", Icon: History },
  ] as const;

  const focusTab = (index: number) => {
    const next = (index + CUSTOMER_DETAIL_TABS.length) % CUSTOMER_DETAIL_TABS.length;
    buttonRefs.current[next]?.focus();
    onChange(CUSTOMER_DETAIL_TABS[next]);
  };

  return (
    <div
      role="tablist"
      aria-label="Customer detail views"
      className="customer-detail-tabs tw:-mb-px tw:flex tw:gap-1 tw:overflow-x-auto tw:border-b tw:border-border"
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
                focusTab(CUSTOMER_DETAIL_TABS.length - 1);
              }
            }}
            className={cn(
              "customer-detail-tabs__tab tw:inline-flex tw:min-h-11 tw:shrink-0 tw:items-center tw:gap-2 tw:border-b-2 tw:px-4 tw:text-sm tw:font-semibold tw:outline-none tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:motion-reduce:transition-none",
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

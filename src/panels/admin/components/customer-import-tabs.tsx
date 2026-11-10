"use client";

import { useRef } from "react";
import { Clock, Download, Upload } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const ORDER = ["import", "export", "history"] as const;

/** Pill-style tab header for the customer import/export views. Panels are rendered by the caller. */
export function CustomerImportTabs({
  value,
  onChange,
  jobCount,
}: {
  value: string;
  onChange: (value: string) => void;
  jobCount: number;
}) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabs = [
    { value: "import", label: "Import", Icon: Upload },
    { value: "export", label: "Export", Icon: Download },
    { value: "history", label: "Job history", Icon: Clock, count: jobCount },
  ] as const;

  const focusTab = (index: number) => {
    const next = (index + ORDER.length) % ORDER.length;
    buttonRefs.current[next]?.focus();
    onChange(ORDER[next]);
  };

  return (
    <div
      role="tablist"
      aria-label="Import and export views"
      className="customer-import-tabs tw:flex tw:flex-wrap tw:gap-2 tw:border-b tw:border-border tw:pb-3"
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
                focusTab(ORDER.length - 1);
              }
            }}
            className={cn(
              "tw:inline-flex tw:min-h-11 tw:items-center tw:gap-2 tw:rounded-lg tw:px-4 tw:text-sm tw:font-semibold tw:outline-none tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:sm:min-h-9 tw:motion-reduce:transition-none",
              selected
                ? "tw:bg-primary tw:text-primary-foreground tw:shadow-(--shadow-soft)"
                : "tw:text-muted-foreground tw:hover:bg-muted tw:hover:text-foreground",
            )}
          >
            <tab.Icon aria-hidden="true" className="tw:size-4 tw:shrink-0" />
            {tab.label}
            {"count" in tab && tab.count !== undefined ? (
              <span className="tw:rounded-full tw:bg-muted tw:px-2 tw:py-0.5 tw:text-xs tw:font-semibold tw:text-muted-foreground">
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

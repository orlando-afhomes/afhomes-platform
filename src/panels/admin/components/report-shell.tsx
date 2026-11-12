"use client";

import { useMemo, useState, type ReactNode } from "react";
import { addMonthsToDate, manilaDateOf, manilaToday } from "@/shared/lib/dates";
import { StandardDateField } from "@/shared/forms/modern";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import type { BreadcrumbItem } from "@/shared/components/modern/breadcrumbs";
import { AdminPage } from "@/shared/components/admin";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Past 7 Days" },
  { value: "28d", label: "Past 28 Days" },
  { value: "6m", label: "Past 6 Months" },
  { value: "custom", label: "Custom range" },
];

function addDays(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Shared date-range state of every report. Each figure filters on its own source event date (doc 11). */
export function useReportRange() {
  const today = manilaToday();
  const [preset, setPreset] = useState("28d");
  const [customFrom, setCustomFrom] = useState(addDays(today, -28));
  const [customTo, setCustomTo] = useState(today);

  const { from, to } = useMemo(() => {
    if (preset === "today") return { from: today, to: today };
    if (preset === "7d") return { from: addDays(today, -7), to: today };
    if (preset === "28d") return { from: addDays(today, -28), to: today };
    if (preset === "6m") return { from: addMonthsToDate(today, -6) ?? today, to: today };
    return { from: customFrom, to: customTo };
  }, [preset, today, customFrom, customTo]);
  const inRange = (date: string | null | undefined) => Boolean(date) && manilaDateOf(date as string) >= from && manilaDateOf(date as string) <= to;

  const filters = (
    <FilterBar filters={[{ label: "Date range", value: preset, onChange: setPreset, options: PRESETS }]}>
      {preset === "custom" ? (
        <>
          <StandardDateField label="Start date" value={customFrom} onChange={setCustomFrom} className="tw:md:min-w-0 tw:md:flex-1" />
          <StandardDateField label="End date" value={customTo} onChange={setCustomTo} className="tw:md:min-w-0 tw:md:flex-1" />
        </>
      ) : null}
    </FilterBar>
  );
  return { from, to, inRange, filters };
}

/** Standard frame of a report page: module gate, breadcrumbs, and date filter. */
export function ReportShell({ range, title, description, crumbs, children }: { range: ReturnType<typeof useReportRange>; title: string; description: string; crumbs: BreadcrumbItem[]; children: ReactNode }) {
  return (
    <AdminPage anyOf={["reports"]} title={title} description={description} crumbs={crumbs}>
      {range.filters}
      {children}
    </AdminPage>
  );
}

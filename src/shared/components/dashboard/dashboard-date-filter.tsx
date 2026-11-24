"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CalendarDays, CalendarRange, SlidersHorizontal, Sun } from "lucide-react";
import { SearchSelect } from "@/shared/components/modern/search-select";
import { StandardDateField } from "@/shared/forms/modern";
import { addDaysToDate, addMonthsToDate, manilaToday } from "@/shared/lib/dates";
import { formatDate } from "@/shared/lib/format-date";

/** Approved reporting presets (doc 11 section 8). */
const PRESETS = [
  { value: "today", label: "Today", description: "Today only", icon: Sun },
  { value: "7d", label: "Past 7 Days", description: "Last 7 days", icon: CalendarDays },
  { value: "28d", label: "Past 28 Days", description: "Last 28 days", icon: CalendarRange },
  { value: "6m", label: "Past 6 Months", description: "Last 6 months", icon: CalendarClock },
  { value: "custom", label: "Custom range", description: "Choose your own dates", icon: SlidersHorizontal },
] as const;

export type DashboardRangePreset = (typeof PRESETS)[number]["value"];

export type DashboardRange = {
  preset: DashboardRangePreset;
  setPreset: (preset: DashboardRangePreset) => void;
  customFrom: string;
  setCustomFrom: (value: string) => void;
  customTo: string;
  setCustomTo: (value: string) => void;
  from: string;
  to: string;
  label: string;
  valid: boolean;
};

function shiftDays(date: string, days: number) {
  return addDaysToDate(date, days) ?? date;
}

/** Local dashboard range state with Asia/Manila date boundaries. It never changes query keys. */
export function useDashboardRange(): DashboardRange {
  const today = manilaToday();
  const [preset, setPreset] = useState<DashboardRangePreset>("28d");
  const [customFrom, setCustomFrom] = useState(shiftDays(today, -28));
  const [customTo, setCustomTo] = useState(today);

  const { from, to } = useMemo(() => {
    if (preset === "today") return { from: today, to: today };
    if (preset === "7d") return { from: shiftDays(today, -7), to: today };
    if (preset === "28d") return { from: shiftDays(today, -28), to: today };
    if (preset === "6m") return { from: addMonthsToDate(today, -6) ?? today, to: today };
    return { from: customFrom, to: customTo };
  }, [preset, today, customFrom, customTo]);

  return {
    preset,
    setPreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    from,
    to,
    label: PRESETS.find((option) => option.value === preset)?.label ?? "Custom range",
    valid: /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to,
  };
}

export function DashboardDateFilter({ range }: { range: DashboardRange }) {
  return (
    // One row from sm up (dates, then the picker), so the picker lines up with the page title; stacked on phones.
    <div className="tw:flex tw:w-full tw:flex-wrap tw:items-center tw:gap-x-4 tw:gap-y-2 tw:sm:w-auto tw:sm:justify-end">
      <div className="tw:w-full tw:sm:order-2 tw:sm:w-60">
        <SearchSelect
          aria-label="Dashboard date range"
          leadingIcon={CalendarDays}
          items={PRESETS.map(({ value, label, description, icon }) => ({ value, label, description, icon }))}
          value={range.preset}
          onChange={(next) => range.setPreset((next ?? "28d") as DashboardRangePreset)}
        />
      </div>
      {range.preset !== "custom" && range.valid ? (
        <p className="tw:m-0 tw:whitespace-nowrap tw:text-sm tw:font-medium tw:text-muted-foreground tw:tabular-nums tw:sm:order-1">
          {formatDate(range.from)} to {formatDate(range.to)}
        </p>
      ) : null}
      {range.preset === "custom" ? (
        <div className="tw:grid tw:w-full tw:grid-cols-2 tw:gap-2 tw:sm:order-3 tw:sm:w-[17rem]">
          <StandardDateField label="Start date" value={range.customFrom} onChange={range.setCustomFrom} className="tw:w-full" />
          <StandardDateField label="End date" value={range.customTo} onChange={range.setCustomTo} className="tw:w-full" />
        </div>
      ) : null}
      {range.valid ? null : (
        <p role="alert" className="tw:m-0 tw:rounded-md tw:bg-destructive/10 tw:px-2.5 tw:py-1.5 tw:text-xs tw:font-medium tw:text-destructive">
          Enter a valid date range: the start date must not be after the end date.
        </p>
      )}
    </div>
  );
}

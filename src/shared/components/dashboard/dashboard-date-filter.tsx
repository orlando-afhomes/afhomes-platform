"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { StandardDateField } from "@/shared/forms/modern";
import { addDaysToDate, addMonthsToDate, manilaToday } from "@/shared/lib/dates";

/** Approved reporting presets (doc 11 section 8). */
const PRESETS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Past 7 Days" },
  { value: "28d", label: "Past 28 Days" },
  { value: "6m", label: "Past 6 Months" },
  { value: "custom", label: "Custom range" },
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
    <div className="tw:flex tw:flex-col tw:items-stretch tw:gap-2 tw:sm:items-end">
      <Select
        items={PRESETS.map((option) => ({ value: option.value, label: option.label }))}
        value={range.preset}
        onValueChange={(next) => range.setPreset((next ?? "28d") as DashboardRangePreset)}
      >
        <SelectTrigger aria-label="Dashboard date range" className="tw:h-10 tw:min-w-44 tw:bg-card">
          <CalendarDays aria-hidden="true" className="tw:size-4 tw:text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="tw:min-h-11 tw:sm:min-h-8">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {range.preset === "custom" ? (
        <div className="tw:grid tw:grid-cols-2 tw:gap-2">
          <StandardDateField label="Start date" value={range.customFrom} onChange={range.setCustomFrom} className="tw:w-36" />
          <StandardDateField label="End date" value={range.customTo} onChange={range.setCustomTo} className="tw:w-36" />
        </div>
      ) : null}
      {range.valid ? null : (
        <p role="alert" className="tw:text-xs tw:text-destructive">
          Enter a valid date range: the start date must not be after the end date.
        </p>
      )}
    </div>
  );
}

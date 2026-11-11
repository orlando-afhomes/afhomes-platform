"use client";

import type { ReactNode } from "react";
import { SearchInput } from "./search-input";
import { Card } from "@/shared/ui/card";
import { SearchSelect } from "./search-select";

export type FilterBarOption = { value: string; label: string };
export type FilterBarFilter = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterBarOption[];
};

/**
 * One card holding every filter of a table: search, selects, and any extra
 * controls passed as children. At md and wider everything sits in a single row
 * of equal-height (44px) controls; narrower screens stack them. Extra children
 * should be 44px tall and carry `tw:md:flex-1` (or `tw:md:flex-none`).
 */
export function FilterBar({
  search,
  onSearch,
  searchLabel,
  filters = [],
  header,
  children,
}: {
  search?: string;
  onSearch?: (value: string) => void;
  searchLabel?: string;
  filters?: FilterBarFilter[];
  /** Full-width first row inside the card, e.g. view chips. */
  header?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card className="tw:flex-col tw:md:flex-row tw:md:flex-nowrap tw:md:items-end tw:rounded-2xl">
      {header ? <div className="tw:w-full">{header}</div> : null}
      {onSearch ? <SearchInput value={search ?? ""} onChange={onSearch} label={searchLabel ?? "Search"} className="tw:md:max-w-none tw:md:min-w-0 tw:md:flex-[2]" /> : null}
      {filters.map((filter) => (
        <div key={filter.label} className="tw:w-full tw:md:min-w-0 tw:md:flex-1">
          <SearchSelect
            aria-label={filter.label}
            items={filter.options}
            value={filter.value}
            onChange={(next) => filter.onChange(next ?? filter.options[0].value)}
          />
        </div>
      ))}
      {children}
    </Card>
  );
}

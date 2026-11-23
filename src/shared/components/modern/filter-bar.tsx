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
 * controls passed as children. The optional `header` (view chips) sits on its
 * own full-width line above the controls. Layout follows the width of the bar
 * itself (container query), not the screen: from 28rem wide the controls share
 * one row of equal-height (44px) fields when they fit (search takes twice the
 * space of a select, and no field gets narrower than 8rem so its value stays
 * readable); when they do not all fit, the row wraps. Narrower bars stack the
 * controls full width.
 * Extra children should be 44px tall and may carry `tw:md:flex-1` (or
 * `tw:md:flex-none` for buttons, which keep their natural width).
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
  /** Full-width first line inside the card, above the controls, e.g. view chips. */
  header?: ReactNode;
  children?: ReactNode;
}) {
  const hasControls = Boolean(onSearch) || filters.length > 0 || Boolean(children);
  return (
    <Card className="tw:@container tw:rounded-2xl">
      {header ? <div className="tw:w-full">{header}</div> : null}
      {hasControls ? (
        <div className="tw:flex tw:flex-col tw:gap-3 tw:@md:flex-row tw:@md:flex-wrap tw:@md:items-end tw:@md:[&>*:not([data-slot=button])]:min-w-36!">
          {onSearch ? <SearchInput value={search ?? ""} onChange={onSearch} label={searchLabel ?? "Search"} className="tw:@md:max-w-none tw:@md:min-w-40 tw:@md:flex-[2_1_10rem]" /> : null}
          {filters.map((filter) => (
            <div key={filter.label} className="tw:w-full tw:@md:min-w-32 tw:@md:flex-[1_1_8rem]">
              <SearchSelect
                aria-label={filter.label}
                items={filter.options}
                value={filter.value}
                onChange={(next) => filter.onChange(next ?? filter.options[0].value)}
              />
            </div>
          ))}
          {children}
        </div>
      ) : null}
    </Card>
  );
}

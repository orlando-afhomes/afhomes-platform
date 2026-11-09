"use client";

import type { ReactNode } from "react";
import { SearchInput } from "./search-input";
import { Card } from "@/shared/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export type FilterBarOption = { value: string; label: string };
export type FilterBarFilter = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterBarOption[];
};

/** Search box plus any number of select filters. */
export function FilterBar({
  search,
  onSearch,
  searchLabel,
  filters = [],
  children,
}: {
  search?: string;
  onSearch?: (value: string) => void;
  searchLabel?: string;
  filters?: FilterBarFilter[];
  children?: ReactNode;
}) {
  return (
    <Card className="tw:flex-col tw:sm:flex-row tw:sm:flex-wrap tw:sm:items-center">
      {onSearch ? <SearchInput value={search ?? ""} onChange={onSearch} label={searchLabel ?? "Search"} /> : null}
      {filters.map((filter) => (
        <Select
          key={filter.label}
          items={filter.options}
          value={filter.value}
          onValueChange={(next) => filter.onChange(next ?? filter.options[0].value)}
        >
          <SelectTrigger aria-label={filter.label} className="tw:h-11 tw:min-w-40 tw:sm:h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value} className="tw:min-h-11 tw:sm:min-h-8">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {children}
    </Card>
  );
}

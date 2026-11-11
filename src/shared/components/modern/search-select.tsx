"use client";

import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/shared/ui/combobox";

export type SearchSelectItem = { value: string; label: string; disabled?: boolean };

/**
 * The app's one dropdown for picking a value: a type-to-filter combobox with a
 * chevron, placeholder and disabled/loading states (Base UI). Every select,
 * filter, and dialog dropdown uses it so they all look and behave the same.
 * Action menus (row "..." menus) are not value pickers and stay DropdownMenu.
 */
export function SearchSelect({
  items,
  value,
  onChange,
  placeholder,
  disabled,
  loading,
  emptyText = "No matches",
  className,
  ...aria
}: {
  items: ReadonlyArray<SearchSelectItem>;
  /** Selected item value; undefined or null means nothing selected. */
  value: string | null | undefined;
  /** Called with the chosen value, or null when the selection is cleared. */
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyText?: string;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-required"?: "true";
  "aria-invalid"?: boolean;
}) {
  const selected = items.find((item) => item.value === value) ?? null;
  return (
    <Combobox
      items={items as SearchSelectItem[]}
      value={selected}
      disabled={disabled || loading}
      onValueChange={(next: SearchSelectItem | null) => onChange(next ? next.value : null)}
    >
      <ComboboxInput placeholder={loading ? "Loading…" : placeholder ?? "Type to search"} className={`tw:h-11${className ? ` ${className}` : ""}`} {...aria} />
      <ComboboxContent>
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: SearchSelectItem) => (
            <ComboboxItem key={item.value} value={item} disabled={item.disabled}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

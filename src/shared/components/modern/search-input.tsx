"use client";

import type { ComponentProps } from "react";
import { Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";

/**
 * Shared search box: icon, accessible label, and the app's standard mobile
 * (h-11) / desktop (sm:h-8) heights. Use inside FilterBar or standalone.
 */
export function SearchInput({
  value,
  onChange,
  label,
  placeholder,
  className,
  inputClassName,
  inputProps,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** Extra input attributes, e.g. keyboard handlers and aria-activedescendant for a suggestion list. */
  inputProps?: Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type" | "className">;
}) {
  return (
    <div className={cn("tw:relative tw:w-full tw:sm:max-w-xs", className)}>
      <Search
        aria-hidden="true"
        className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-2.5 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground"
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={placeholder ?? label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn("tw:h-11 tw:pl-8", inputClassName)}
        {...inputProps}
      />
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { FilterBar, type FilterBarFilter, type FilterBarOption } from "../modern/filter-bar";

export type { FilterBarFilter as AdminFilter, FilterBarOption as AdminFilterOption };

/** Search box plus select filters in the admin card row. Same behavior as FilterBar. */
export function AdminFilterBar({
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
    <FilterBar search={search} onSearch={onSearch} searchLabel={searchLabel} filters={filters}>
      {children}
    </FilterBar>
  );
}

/** Numbered process step card with an optional vertical connector to the next step. */
export function StepBlock({
  step,
  title,
  description,
  actions,
  connector = false,
  children,
}: {
  step: number;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  connector?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="admin-step tw:relative">
      <section
        aria-label={`Step ${step}: ${title}`}
        className="tw:flex tw:flex-col tw:gap-4 tw:rounded-2xl tw:border tw:border-border tw:bg-card tw:p-5 tw:text-card-foreground tw:shadow-(--shadow-soft) tw:sm:p-6"
      >
        <div className="tw:flex tw:flex-col tw:gap-4 tw:lg:flex-row tw:lg:items-start tw:lg:justify-between">
          <div className="tw:flex tw:min-w-0 tw:items-start tw:gap-4">
            <span
              aria-hidden="true"
              className="tw:flex tw:size-9 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-[var(--color-brand-soft)] tw:text-base tw:font-bold tw:text-primary"
            >
              {step}
            </span>
            <div className="tw:min-w-0">
              <h2 className="tw:text-lg tw:font-semibold tw:leading-snug">{title}</h2>
              {description ? <div className="tw:mt-1 tw:text-sm tw:text-muted-foreground">{description}</div> : null}
            </div>
          </div>
          {actions ? <div className="tw:flex tw:shrink-0 tw:flex-wrap tw:gap-2">{actions}</div> : null}
        </div>
        {children}
      </section>
      {connector ? (
        <span
          aria-hidden="true"
          className="tw:absolute tw:top-full tw:left-[2.8rem] tw:h-6 tw:border-l-2 tw:border-dashed tw:border-border"
        />
      ) : null}
    </div>
  );
}

/** Explainer card with a leading icon tile, divider, and aside mini-cards. */
export function InfoSplitCard({
  icon: Icon,
  title,
  children,
  aside,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="tw:grid tw:gap-4 tw:lg:grid-cols-[minmax(0,1fr)_16rem]">
      <section
        aria-label={title}
        className="tw:flex tw:gap-4 tw:rounded-2xl tw:border tw:border-border tw:bg-card tw:p-5 tw:text-card-foreground tw:shadow-(--shadow-soft) tw:sm:p-6"
      >
        <span
          aria-hidden="true"
          className="tw:flex tw:size-12 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl tw:bg-[var(--color-brand-soft)] tw:text-primary"
        >
          <Icon className="tw:size-6" strokeWidth={1.75} />
        </span>
        <span aria-hidden="true" className="tw:w-px tw:shrink-0 tw:bg-border" />
        <div className="tw:min-w-0 tw:flex-1">
          <h2 className="tw:text-lg tw:font-semibold tw:leading-snug">{title}</h2>
          <div className="tw:mt-1 tw:text-sm tw:text-muted-foreground">{children}</div>
        </div>
      </section>
      {aside ? <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-4">{aside}</div> : null}
    </div>
  );
}

/** Small icon + title + lines card for the aside column of InfoSplitCard. */
export function InfoMiniCard({
  icon: Icon,
  title,
  lines,
}: {
  icon: LucideIcon;
  title: string;
  lines: readonly string[];
}) {
  return (
    <div className="tw:flex tw:gap-3 tw:rounded-2xl tw:border tw:border-border tw:bg-card tw:p-4 tw:text-card-foreground tw:shadow-(--shadow-soft)">
      <span
        aria-hidden="true"
        className="tw:flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl tw:bg-[var(--color-brand-soft)] tw:text-primary"
      >
        <Icon className="tw:size-5" strokeWidth={1.75} />
      </span>
      <div className="tw:min-w-0">
        <p className="tw:text-sm tw:font-semibold">{title}</p>
        {lines.map((line) => (
          <p key={line} className="tw:text-sm tw:text-muted-foreground">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { cn } from "@/shared/lib/utils";

export type DetailRowItem = {
  label: string;
  value: ReactNode;
  /** Let the value span both columns (long text, addresses, notes). */
  wide?: boolean;
};

export type DetailSection = {
  title?: string;
  rows: ReadonlyArray<DetailRowItem>;
};

export type DetailHistoryItem = { key: string; when: string; text: string };

const SECTION_TITLE = "tw:m-0 tw:text-xs tw:font-semibold tw:tracking-wide tw:text-muted-foreground tw:uppercase";

/**
 * Right-hand details panel for a table row (full width on phones). Pages map a
 * record to sections of label/value rows; the sheet itself holds no business
 * logic. Empty values show an em dash so a missing field is visible, not blank.
 */
export function RecordDetailsSheet({
  open,
  onClose,
  title,
  subtitle,
  badge,
  icon,
  sections,
  history,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  /** Optional icon shown in a soft brand-tinted circle beside the title. */
  icon?: ReactNode;
  sections: ReadonlyArray<DetailSection>;
  history?: ReadonlyArray<DetailHistoryItem>;
  footer?: ReactNode;
  /** Panel width from the sm breakpoint: "md" (default) or "lg" for wide records. */
  size?: "md" | "lg";
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <SheetContent
        className={cn(
          "record-details tw:gap-0 tw:overflow-hidden tw:data-[side=right]:w-full",
          size === "lg" ? "tw:sm:data-[side=right]:max-w-2xl" : "tw:sm:data-[side=right]:max-w-md",
        )}
      >
        <SheetHeader className="tw:flex-row tw:items-start tw:gap-3 tw:border-b tw:border-border tw:p-4 tw:pr-12">
          {icon ? (
            <span
              aria-hidden="true"
              className="tw:flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-primary/10 tw:text-primary tw:*:[svg]:size-5"
            >
              {icon}
            </span>
          ) : null}
          <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-1">
            <SheetTitle className="tw:text-lg tw:leading-snug tw:font-bold tw:tracking-tight">{title}</SheetTitle>
            {subtitle ? <SheetDescription>{subtitle}</SheetDescription> : null}
            {badge ? <div className="tw:mt-1">{badge}</div> : null}
          </div>
        </SheetHeader>
        <div className="tw:flex tw:min-h-0 tw:flex-1 tw:flex-col tw:gap-4 tw:overflow-y-auto tw:p-4">
          {sections.map((section, index) => (
            <section
              key={section.title ?? index}
              aria-label={section.title}
              className="tw:flex tw:flex-col tw:gap-3 tw:rounded-lg tw:border tw:border-border tw:bg-muted/40 tw:p-4"
            >
              {section.title ? <h3 className={SECTION_TITLE}>{section.title}</h3> : null}
              <dl className="tw:m-0 tw:grid tw:grid-cols-1 tw:gap-x-6 tw:gap-y-3 tw:sm:grid-cols-2">
                {section.rows.map((row, rowIndex) => (
                  <div
                    key={`${row.label}-${rowIndex}`}
                    className={cn("tw:flex tw:min-w-0 tw:flex-col tw:gap-0.5", row.wide && "tw:sm:col-span-2")}
                  >
                    <dt className="tw:text-xs tw:text-muted-foreground">{row.label}</dt>
                    <dd className="tw:m-0 tw:text-sm tw:font-medium tw:break-words tw:text-foreground tw:tabular-nums">
                      {row.value === null || row.value === undefined || row.value === "" ? "—" : row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          {history && history.length > 0 ? (
            <section
              aria-label="History"
              className="tw:flex tw:flex-col tw:gap-3 tw:rounded-lg tw:border tw:border-border tw:bg-muted/40 tw:p-4"
            >
              <h3 className={SECTION_TITLE}>History</h3>
              <ol className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-4 tw:border-l tw:border-border tw:p-0 tw:pl-5">
                {history.map((item) => (
                  <li key={item.key} className="tw:relative tw:flex tw:flex-col tw:gap-0.5">
                    <span
                      aria-hidden="true"
                      className="tw:absolute tw:top-1.5 tw:-left-[1.625rem] tw:size-2 tw:rounded-full tw:bg-primary tw:ring-4 tw:ring-background"
                    />
                    <span className="tw:text-xs tw:text-muted-foreground tw:tabular-nums">{item.when}</span>
                    <span className="tw:text-sm tw:break-words">{item.text}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
        {footer ? (
          <div
            data-slot="sheet-footer"
            className="tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-2 tw:border-t tw:border-border tw:bg-popover tw:p-4"
          >
            {footer}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

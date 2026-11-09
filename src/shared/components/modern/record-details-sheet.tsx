"use client";

import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { DetailList, DetailRow } from "./detail-list";

export type DetailSection = {
  title?: string;
  rows: ReadonlyArray<{ label: string; value: ReactNode }>;
};

export type DetailHistoryItem = { key: string; when: string; text: string };

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
  sections,
  history,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  sections: ReadonlyArray<DetailSection>;
  history?: ReadonlyArray<DetailHistoryItem>;
  footer?: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <SheetContent className="record-details tw:overflow-y-auto tw:data-[side=right]:w-full tw:sm:data-[side=right]:max-w-md">
        <SheetHeader className="tw:gap-2 tw:border-b tw:border-border tw:pr-12">
          <SheetTitle className="tw:text-lg tw:font-semibold tw:tracking-tight">{title}</SheetTitle>
          {subtitle ? <SheetDescription>{subtitle}</SheetDescription> : null}
          {badge ? <div>{badge}</div> : null}
        </SheetHeader>
        <div className="tw:flex tw:flex-col tw:gap-5 tw:px-4">
          {sections.map((section, index) => (
            <section key={section.title ?? index} aria-label={section.title} className="tw:flex tw:flex-col tw:gap-1">
              {section.title ? <h3 className="tw:text-xs tw:font-semibold tw:tracking-wide tw:text-muted-foreground tw:uppercase">{section.title}</h3> : null}
              <DetailList>
                {section.rows.map((row, rowIndex) => (
                  <DetailRow key={`${row.label}-${rowIndex}`} term={row.label}>
                    {row.value === null || row.value === undefined || row.value === "" ? "—" : row.value}
                  </DetailRow>
                ))}
              </DetailList>
            </section>
          ))}
          {history && history.length > 0 ? (
            <section aria-label="History" className="tw:flex tw:flex-col tw:gap-2">
              <h3 className="tw:text-xs tw:font-semibold tw:tracking-wide tw:text-muted-foreground tw:uppercase">History</h3>
              <ol className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-2 tw:border-l tw:border-border tw:p-0 tw:pl-3">
                {history.map((item) => (
                  <li key={item.key} className="tw:flex tw:flex-col">
                    <span className="tw:text-xs tw:text-muted-foreground">{item.when}</span>
                    <span className="tw:text-sm">{item.text}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
        {footer ? <SheetFooter className="tw:border-t tw:border-border">{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  );
}

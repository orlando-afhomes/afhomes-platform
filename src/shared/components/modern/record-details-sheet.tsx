"use client";

import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { cn } from "@/shared/lib/utils";
import { DetailHistory, DetailSectionCard, type DetailHistoryItem, type DetailSection } from "./record-details";

export type { DetailRowItem, DetailTone, DetailSection, DetailHistoryItem } from "./record-details";

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
        <SheetHeader className="tw:flex-row tw:items-start tw:gap-3 tw:border-b tw:border-border tw:bg-muted/30 tw:p-4 tw:pr-12">
          {icon ? (
            <span
              aria-hidden="true"
              className="tw:flex tw:size-11 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl tw:bg-primary/10 tw:text-primary tw:*:[svg]:size-5"
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
        <div className="tw:flex tw:min-h-0 tw:flex-1 tw:flex-col tw:gap-3 tw:overflow-y-auto tw:bg-muted/30 tw:p-4">
          {sections.map((section, index) => (
            <DetailSectionCard key={section.title ?? index} section={section} />
          ))}
          {history ? <DetailHistory history={history} /> : null}
        </div>
        {footer ? (
          <div
            data-slot="sheet-footer"
            className="tw:flex tw:items-center tw:justify-end tw:gap-2 tw:empty:hidden tw:border-t tw:border-border tw:bg-popover tw:p-4"
          >
            {footer}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

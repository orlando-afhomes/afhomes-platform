"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/utils";
import { DetailSectionCard, type DetailSection } from "./record-details";

/** Centered, scrollable details modal shared by the admin detail dialogs. */
export function RecordDetailsDialog({
  open,
  onClose,
  title,
  subtitle,
  badge,
  icon,
  notice,
  sections,
  footer,
  size = "lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  icon?: ReactNode;
  notice?: ReactNode;
  sections: ReadonlyArray<DetailSection>;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent
        className={cn(
          "tw:grid tw:max-h-[calc(100dvh-2rem)] tw:grid-rows-[auto_minmax(0,1fr)_auto] tw:gap-0 tw:overflow-hidden tw:p-0",
          size === "lg" ? "tw:sm:max-w-2xl" : "tw:sm:max-w-md",
        )}
      >
        <div className="tw:flex tw:items-start tw:gap-3 tw:border-b tw:border-border tw:bg-muted/30 tw:p-5 tw:pr-12">
          {icon ? (
            <span
              aria-hidden="true"
              className="tw:flex tw:size-12 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl tw:bg-primary/10 tw:text-primary tw:*:[svg]:size-5"
            >
              {icon}
            </span>
          ) : null}
          <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-1">
            <DialogTitle className="tw:text-lg tw:leading-snug tw:font-bold tw:tracking-tight">{title}</DialogTitle>
            {subtitle ? <DialogDescription>{subtitle}</DialogDescription> : null}
            {badge ? <div className="tw:mt-2 tw:flex tw:flex-wrap tw:gap-1.5">{badge}</div> : null}
          </div>
        </div>
        <div className="tw:flex tw:min-h-0 tw:flex-col tw:gap-3 tw:overflow-y-auto tw:bg-muted/30 tw:p-4">
          {notice}
          {sections.map((section, index) => (
            <DetailSectionCard key={section.title ?? index} section={section} />
          ))}
        </div>
        {footer ? (
          <DialogFooter className="tw:flex tw:flex-row tw:items-center tw:justify-end tw:gap-2 tw:m-0 tw:border-t tw:border-border tw:bg-popover tw:p-4">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

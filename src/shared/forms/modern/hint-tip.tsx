"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

/**
 * Small info icon that reveals a field's guide note (owner instruction
 * 2026-11-20). Hovering opens the note, clicking toggles it, and Escape or an
 * outside click closes it. The button's description points at the field label,
 * so screen readers hear which field the guide belongs to without a second
 * accessible name that collides with the field label.
 */
export function HintTip({ labelId, text }: { labelId: string; text: string }) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        closeDelay={80}
        aria-describedby={labelId}
        className="tw:inline-flex tw:size-5 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:text-muted-foreground tw:transition-colors tw:hover:text-foreground tw:focus-visible:ring-3 tw:focus-visible:ring-ring/40 tw:focus-visible:outline-none"
      >
        <Info aria-hidden="true" className="tw:size-3.5" />
        <span className="tw:sr-only">Field guide</span>
      </PopoverTrigger>
      <PopoverContent
        role="tooltip"
        initialFocus={false}
        finalFocus={false}
        side="top"
        align="start"
        sideOffset={6}
        className="tw:w-max tw:max-w-72 tw:px-2.5 tw:py-1.5 tw:text-xs tw:leading-snug"
      >
        {text}
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function NavGroup({
  label,
  children,
  defaultOpen = false,
  hasActiveDescendant = false,
}: {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
  hasActiveDescendant?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || hasActiveDescendant);

  return (
    <div className="space-y-1">
      <button
        type="button"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent",
        )}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{label}</span>
        <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} />
      </button>
      {open ? <div className="ml-2 space-y-1">{children}</div> : null}
    </div>
  );
}

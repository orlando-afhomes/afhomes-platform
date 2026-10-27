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
    <div className="nav-group">
      <button
        type="button"
        aria-expanded={open}
        className={cn("nav-group__toggle")}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="nav-group__label">{label}</span>
        <ChevronRight className={cn("nav-group__icon", open && "nav-group__icon--open")} />
      </button>
      {open ? <div className="nav-group__children">{children}</div> : null}
    </div>
  );
}

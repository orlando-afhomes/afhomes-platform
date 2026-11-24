"use client";

import type { LucideIcon } from "lucide-react";
import { StatusBadge, ToneBadge, type BadgeTone } from "../modern/status-badge";

export function StatusPill({ tone = "neutral", icon, children, className }: {
  tone?: BadgeTone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return <ToneBadge tone={tone} icon={icon} className={className}>{children}</ToneBadge>;
}

/** Compatibility entry point for business badges and existing admin callers. */
export const StatusPillForStatus = StatusBadge;

"use client";

import { BadgeCheck, CircleCheck, CircleX, Clock, Hourglass, Minus, Pencil, ShieldAlert, type LucideIcon } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { toneClass, type BadgeTone } from "../modern/status-badge";
import { formatStatusLabel } from "@/shared/utils/input-sanitizers";

/** Icon + label pill. Text always carries the meaning; color only reinforces it. */
export function StatusPill({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn(toneClass(tone), "tw:gap-1", className)}>
      {Icon ? <Icon aria-hidden="true" className="tw:size-3.5" /> : null}
      {children}
    </Badge>
  );
}

const STATUS_MAP: Record<string, { tone: BadgeTone; icon?: LucideIcon }> = {
  submitted: { tone: "info", icon: CircleCheck },
  under_review: { tone: "info", icon: CircleCheck },
  verified: { tone: "success", icon: CircleCheck },
  finalized: { tone: "success", icon: BadgeCheck },
  approved: { tone: "info", icon: CircleCheck },
  confirmed: { tone: "success", icon: BadgeCheck },
  active: { tone: "success", icon: BadgeCheck },
  active_member: { tone: "success", icon: BadgeCheck },
  paid: { tone: "success", icon: BadgeCheck },
  draft: { tone: "warning", icon: Pencil },
  returned: { tone: "warning", icon: Pencil },
  pending: { tone: "warning", icon: Clock },
  on_hold: { tone: "warning", icon: Hourglass },
  due: { tone: "warning", icon: Clock },
  partial: { tone: "warning", icon: Clock },
  overdue: { tone: "danger", icon: Clock },
  cancelled: { tone: "danger", icon: CircleX },
  rejected: { tone: "danger", icon: CircleX },
  expired: { tone: "danger", icon: CircleX },
  voided: { tone: "danger", icon: CircleX },
  conflict: { tone: "danger", icon: ShieldAlert },
  suspended: { tone: "warning", icon: Clock },
  spendable: { tone: "success", icon: BadgeCheck },
  held: { tone: "warning", icon: Hourglass },
  blocked_rounding: { tone: "warning", icon: ShieldAlert },
  pending_owner_decision: { tone: "warning", icon: Hourglass },
  configured: { tone: "success", icon: BadgeCheck },
  available: { tone: "success", icon: BadgeCheck },
  contract_stated: { tone: "neutral" },
  unavailable: { tone: "neutral" },
  retired: { tone: "neutral" },
  outside_cycles: { tone: "neutral" },
  inactive: { tone: "neutral", icon: Minus },
};

/** Status pill driven by a record status string. Unknown statuses render neutral text without an icon. */
export function StatusPillForStatus({ status, label }: { status: string; label?: string }) {
  const mapped = STATUS_MAP[status];
  return (
    <StatusPill tone={mapped?.tone ?? "neutral"} icon={mapped?.icon}>
      {label ?? formatStatusLabel(status.replace(/_/g, " "))}
    </StatusPill>
  );
}

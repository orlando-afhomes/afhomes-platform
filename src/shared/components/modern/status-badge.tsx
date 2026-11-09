import type { ReactNode } from "react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { formatStatusLabel } from "@/shared/utils/input-sanitizers";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "tw:bg-success/10 tw:text-success",
  warning: "tw:bg-warning/10 tw:text-warning",
  danger: "tw:bg-destructive/10 tw:text-destructive",
  info: "tw:bg-info/10 tw:text-info",
  neutral: "tw:bg-muted tw:text-muted-foreground",
};

/** Shared Tailwind tone classes so business and account badges never duplicate strings. */
export function toneClass(tone: BadgeTone): string {
  return TONE_CLASSES[tone];
}

// Same status vocabulary as the legacy badge. Text always carries the meaning;
// color only reinforces it.
const STATUS_TONES: Record<string, BadgeTone> = {
  active: "success",
  accredited: "success",
  approved: "success",
  valid: "success",
  eligible: "success",
  pending: "warning",
  suspended: "warning",
  revoked: "danger",
  cancelled: "danger",
  rejected: "danger",
  ineligible: "danger",
  expired: "danger",
};

/** Labelled badge with an explicit tone, for values that are not account or record statuses. */
export function ToneBadge({ tone = "neutral", className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <Badge variant="secondary" className={cn(toneClass(tone), className)}>
      {children}
    </Badge>
  );
}

export function StatusBadge({ status, tone, className }: { status: string; tone?: BadgeTone; className?: string }) {
  const resolved = tone ?? STATUS_TONES[status.trim().toLowerCase()] ?? "neutral";
  return (
    <Badge variant="secondary" className={cn(toneClass(resolved), className)}>
      {formatStatusLabel(status)}
    </Badge>
  );
}

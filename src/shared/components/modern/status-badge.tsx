import type { ReactNode } from "react";
import {
  Archive, BadgeCheck, Ban, CalendarClock, CalendarDays, CalendarX, CircleCheck, CircleDot, CircleMinus, CircleX, Clock, Coins,
  FileCheck, FileText, Gift, Hourglass, LockKeyhole, LogIn, Minus, Pause, Pencil, RefreshCw, Search,
  Send, ShieldAlert, ShieldCheck, TimerOff, Undo2, UserMinus, type LucideIcon,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { humanize } from "@/shared/lib/humanize";

/**
 * The nine badge hues (`--badge-*` in tokens.css), plus brand and neutral. Older names stay as
 * aliases so existing callers keep working: success is green, warning amber, danger red, info blue.
 */
export type BadgeTone =
  | "red" | "orange" | "amber" | "green" | "teal" | "blue" | "indigo" | "violet" | "pink"
  | "brand" | "neutral"
  | "success" | "warning" | "danger" | "info" | "cyan" | "burgundy" | "rose";

// Whole class strings, so Tailwind can see them. Text lifts toward white in dark mode.
const RED = "tw:bg-(--badge-red)/10 tw:text-(--badge-red) tw:dark:text-[color-mix(in_oklch,var(--badge-red),white_45%)]";
const ORANGE = "tw:bg-(--badge-orange)/10 tw:text-(--badge-orange) tw:dark:text-[color-mix(in_oklch,var(--badge-orange),white_45%)]";
const AMBER = "tw:bg-(--badge-amber)/10 tw:text-(--badge-amber) tw:dark:text-[color-mix(in_oklch,var(--badge-amber),white_45%)]";
const GREEN = "tw:bg-(--badge-green)/10 tw:text-(--badge-green) tw:dark:text-[color-mix(in_oklch,var(--badge-green),white_45%)]";
const TEAL = "tw:bg-(--badge-teal)/10 tw:text-(--badge-teal) tw:dark:text-[color-mix(in_oklch,var(--badge-teal),white_45%)]";
const BLUE = "tw:bg-(--badge-blue)/10 tw:text-(--badge-blue) tw:dark:text-[color-mix(in_oklch,var(--badge-blue),white_45%)]";
const INDIGO = "tw:bg-(--badge-indigo)/10 tw:text-(--badge-indigo) tw:dark:text-[color-mix(in_oklch,var(--badge-indigo),white_45%)]";
const VIOLET = "tw:bg-(--badge-violet)/10 tw:text-(--badge-violet) tw:dark:text-[color-mix(in_oklch,var(--badge-violet),white_45%)]";
const PINK = "tw:bg-(--badge-pink)/10 tw:text-(--badge-pink) tw:dark:text-[color-mix(in_oklch,var(--badge-pink),white_45%)]";

const TONE_CLASSES: Record<BadgeTone, string> = {
  red: RED, orange: ORANGE, amber: AMBER, green: GREEN, teal: TEAL, blue: BLUE, indigo: INDIGO, violet: VIOLET, pink: PINK,
  brand: "tw:bg-primary/10 tw:text-primary",
  neutral: "tw:bg-muted tw:text-muted-foreground",
  success: GREEN, warning: AMBER, danger: RED, info: BLUE, cyan: TEAL, burgundy: PINK, rose: PINK,
};

export function toneClass(tone: BadgeTone): string {
  return TONE_CLASSES[tone];
}

type Treatment = "filled" | "outline" | "dashed";
type StatusPresentation = { tone: BadgeTone; icon: LucideIcon; treatment?: Treatment };

// Statuses that appear in the same list never share a hue (status-presentation.test.ts checks every group).
const STYLES = {
  draft: { tone: "neutral", icon: Pencil, treatment: "dashed" },
  submitted: { tone: "blue", icon: Send },
  under_review: { tone: "indigo", icon: Search, treatment: "outline" },
  returned: { tone: "violet", icon: Undo2 },
  approved: { tone: "green", icon: CircleCheck },
  verified: { tone: "green", icon: ShieldCheck },
  confirmed: { tone: "green", icon: BadgeCheck },
  finalized: { tone: "teal", icon: FileCheck },
  active: { tone: "teal", icon: BadgeCheck },
  paid: { tone: "teal", icon: Coins },
  pending: { tone: "amber", icon: Clock, treatment: "outline" },
  on_hold: { tone: "orange", icon: Pause, treatment: "outline" },
  due: { tone: "amber", icon: CalendarClock },
  partial: { tone: "blue", icon: CircleDot, treatment: "outline" },
  overdue: { tone: "red", icon: CalendarX },
  cancelled: { tone: "pink", icon: Ban },
  rejected: { tone: "red", icon: CircleX },
  expired: { tone: "orange", icon: Hourglass },
  voided: { tone: "pink", icon: CircleX, treatment: "outline" },
  conflict: { tone: "red", icon: ShieldAlert },
  suspended: { tone: "violet", icon: LockKeyhole },
  inactive: { tone: "neutral", icon: CircleMinus, treatment: "outline" },
  archived: { tone: "neutral", icon: Archive },
  replaced: { tone: "violet", icon: RefreshCw, treatment: "outline" },
  released: { tone: "blue", icon: BadgeCheck },
  released_by_waiver: { tone: "violet", icon: Gift },
  forfeited: { tone: "pink", icon: CircleX, treatment: "outline" },
  non_activated: { tone: "neutral", icon: Minus, treatment: "dashed" },
  defaulted: { tone: "orange", icon: ShieldAlert },
  upcoming: { tone: "indigo", icon: CalendarDays, treatment: "dashed" },
  ready: { tone: "teal", icon: CircleCheck, treatment: "outline" },
  unmatched: { tone: "orange", icon: Search, treatment: "dashed" },
  checked_in: { tone: "blue", icon: LogIn, treatment: "outline" },
  provisional: { tone: "violet", icon: Clock, treatment: "dashed" },
  late_cancelled: { tone: "orange", icon: TimerOff, treatment: "outline" },
  transfer_cancelled: { tone: "violet", icon: RefreshCw },
  withdrawal: { tone: "pink", icon: UserMinus, treatment: "outline" },
} satisfies Record<string, StatusPresentation>;

const ALIASES: Readonly<Record<string, keyof typeof STYLES>> = {
  pending_review: "under_review", needs_review: "under_review", under_assessment: "under_review",
  sent_back: "returned", needs_info: "returned",
  active_member: "active", available: "active", accredited: "active", valid: "active", published: "active", open: "active",
  eligible: "approved", configured: "approved", spendable: "approved", linked: "approved", signed_off: "confirmed", matched: "confirmed",
  completed: "finalized", settled: "paid",
  pending_approval: "pending", pending_activation: "pending", pending_payment: "pending", pending_owner_decision: "pending", pending_signoff: "pending", unreleased: "pending",
  held: "on_hold", financial_hold: "on_hold", paused: "on_hold", blocked_rounding: "on_hold",
  expires_today: "due", eligible_renewal_due: "due",
  ineligible: "rejected", invalid: "rejected", declined: "rejected", no_show: "rejected",
  withdrawn: "withdrawal", revoked: "conflict", deactivated: "inactive", unavailable: "inactive", retired: "archived", ended: "archived",
  outside_cycles: "inactive", incomplete: "draft", contract_stated: "draft", closed: "archived",
};

/** Every status key the app shows, for the tests that compare neighbors. */
export const STATUS_KEYS: readonly string[] = [...Object.keys(STYLES), ...Object.keys(ALIASES)];

const STATUS_STYLES: Readonly<Record<string, StatusPresentation>> = STYLES;
const FALLBACK: StatusPresentation = { tone: "neutral", icon: FileText, treatment: "outline" };

export function statusPresentation(status: string): StatusPresentation {
  const key = status.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return (Object.hasOwn(STYLES, key) ? STATUS_STYLES[key] : Object.hasOwn(ALIASES, key) ? STYLES[ALIASES[key]] : FALLBACK);
}

export function ToneBadge({ tone = "neutral", className, children, icon: Icon, treatment = "filled" }: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
  icon?: LucideIcon;
  treatment?: Treatment;
}) {
  return (
    <Badge variant="secondary" className={cn(
      toneClass(tone),
      treatment !== "filled" && "tw:border-current/50 tw:bg-transparent",
      treatment === "dashed" && "tw:border-dashed",
      className,
    )}>
      {Icon ? <Icon aria-hidden="true" /> : null}
      {children}
    </Badge>
  );
}

export function StatusBadge({ status, tone, label, className }: { status: string; tone?: BadgeTone; label?: string; className?: string }) {
  const presentation = statusPresentation(status);
  return (
    <ToneBadge {...presentation} tone={tone ?? presentation.tone} className={className}>
      {label ?? (status === "defaulted" ? "Stopped Paying" : humanize(status))}
    </ToneBadge>
  );
}

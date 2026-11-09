import { StatusBadge, type BadgeTone } from "@/shared/components/modern/status-badge";

const BUSINESS_TONES: Record<string, BadgeTone> = {
  draft: "neutral",
  submitted: "info",
  under_review: "info",
  returned: "warning",
  finalized: "success",
  cancelled: "danger",
  rejected: "danger",
  verified: "success",
  pending: "warning",
  confirmed: "success",
  active: "success",
  expired: "danger",
  suspended: "warning",
  approved: "info",
  on_hold: "warning",
  paid: "success",
  overdue: "danger",
  due: "warning",
  partial: "warning",
  upcoming: "neutral",
  spendable: "success",
  held: "warning",
  voided: "danger",
  blocked_rounding: "warning",
  outside_cycles: "neutral",
  conflict: "danger",
  contract_stated: "neutral",
  configured: "success",
  pending_owner_decision: "warning",
  available: "success",
  unavailable: "neutral",
  retired: "neutral",
  active_member: "success",
  inactive: "neutral",
};

/** Business status badge: readable text first, tone only reinforces it. */
export function BizBadge({ status, label }: { status: string; label?: string }) {
  return <StatusBadge status={label ?? status.replace(/_/g, " ")} tone={BUSINESS_TONES[status] ?? "neutral"} />;
}

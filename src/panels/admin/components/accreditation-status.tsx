"use client";

import { StatusBadge } from "@/shared/components/layout/status-badge";
import type { AccreditationAdminStatus } from "@/modules/accreditation/types";
import type { AccreditationExpiryState as ExpiryState } from "@/modules/accreditation/dates";

const EXPIRY_LABELS: Record<ExpiryState, string> = {
  valid: "Valid",
  expires_today: "Expires today",
  expired: "Expired",
  incomplete: "Incomplete dates",
};

const EXPIRY_COLORS: Record<ExpiryState, string | undefined> = {
  valid: "green",
  expires_today: "gold",
  expired: "red",
  incomplete: undefined,
};

export function AccreditationStatusTag({ status }: { status: AccreditationAdminStatus }) {
  return <StatusBadge status={status} className="accreditation-status__tag" />;
}

export function AccreditationExpiryTag({ state }: { state: ExpiryState }) {
  return (
    <Tag color={EXPIRY_COLORS[state]} className="accreditation-expiry__tag">
      {EXPIRY_LABELS[state]}
    </Tag>
  );
}

export function AccreditationEligibilityTag({ eligible }: { eligible: boolean }) {
  return (
    <StatusBadge status={eligible ? "Eligible" : "Ineligible"} color={eligible ? "green" : "red"} className="accreditation-eligibility__tag" />
  );
}

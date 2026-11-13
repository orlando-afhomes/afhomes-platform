"use client";

import { StatusBadge, ToneBadge, type BadgeTone } from "@/shared/components/modern/status-badge";
import type { AccreditationAdminStatus } from "@/modules/accreditation/types";
import type { AccreditationExpiryState as ExpiryState } from "@/modules/accreditation/dates";

const EXPIRY_LABELS: Record<ExpiryState, string> = {
  valid: "Valid",
  expires_today: "Expires today",
  expired: "Expired",
  incomplete: "Incomplete dates",
};

const EXPIRY_TONES: Record<ExpiryState, BadgeTone> = {
  valid: "success",
  expires_today: "warning",
  expired: "danger",
  incomplete: "neutral",
};

export function AccreditationStatusTag({ status }: { status: AccreditationAdminStatus }) {
  return <StatusBadge status={status} />;
}

export function AccreditationExpiryTag({ state }: { state: ExpiryState }) {
  return <ToneBadge tone={EXPIRY_TONES[state]}>{EXPIRY_LABELS[state]}</ToneBadge>;
}

/** An expired seller stays eligible to sell, refer and sponsor, with a renewal reminder (doc 03 section 9). */
export function AccreditationEligibilityTag({ eligible, expired = false }: { eligible: boolean; expired?: boolean }) {
  if (eligible && expired) return <StatusBadge status="Eligible, renewal due" tone="warning" />;
  return <StatusBadge status={eligible ? "Eligible" : "Ineligible"} tone={eligible ? "success" : "danger"} />;
}

import type { Contract } from "@/modules/contracts/types";
import type { Membership } from "@/modules/membership/types";
import { addYearsToDate } from "@/shared/lib/dates";
import { appendAuditEvent } from "./audit";
import { nowIso, today } from "./business-base";
import type { MockStore } from "./seed";

export function recordDueDeemedClaim(store: MockStore, membership: Membership, contract: Contract): void {
  if (membership.status !== "active" || !membership.cardId || membership.cardClaimDate || !membership.fullSettlementDate) return;
  const deadline = addYearsToDate(membership.fullSettlementDate, 1);
  if (!deadline || today() < deadline) return;
  membership.cardClaimDate = deadline;
  membership.cardClaimKind = "deemed";
  membership.validityEndDate = addYearsToDate(deadline, contract.validityYears);
  membership.history.push({ at: nowIso(), actorId: "system", event: "CARD_CLAIM_DEEMED", note: deadline });
  appendAuditEvent(store, { module: "membership", action: "CARD_CLAIM_DEEMED", entityType: "membership", entityId: membership.id,
    displayReference: membership.cardId, newValue: deadline, actorId: "system", actorRoles: ["system"], outcome: "success" });
}

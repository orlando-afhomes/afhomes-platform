import "server-only";
import type { MembershipPoints, StayPointsAction } from "@/data/contracts/stay-points-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { nextOfficialReceiptNo } from "@/modules/finance/payment-reference";
import { canSeeContractRecord } from "@/modules/identity/record-scope";
import type { Membership } from "@/modules/membership/types";
import { WAIVER_GROUNDS } from "@/modules/stay-points/types";
import { addDaysToDate, parseManilaDateOnly } from "@/shared/lib/dates";
import type { Actor } from "@/server/auth/actor";
import { requireOperation } from "@/server/auth/authorize";
import { dbRead, listAll } from "@/server/db";
import { centavosToInt64, int64ToCentavos } from "@/server/money";
import {
  loadContract, loadCustomers, loadMembership, loadMembershipSpends, loadMemberships, loadWaiversOfMembership,
} from "@/server/repositories/records";
import { conflict, invalid, newId, notFound, today, transact } from "@/server/services/common";
import { paperNumberTaken } from "@/server/services/payments";
import { ledgerOf } from "@/server/services/stay-points-ledger";

/** The membership's points view for one visible membership; null when the viewer may not see its contract. */
async function build(actor: Actor, membership: Membership): Promise<MembershipPoints | null> {
  const contract = await loadContract(membership.contractId);
  if (!contract || !canSeeContractRecord(actor.identity, contract.contract)) return null;
  const [{ spends, refunds }, waivers] = await Promise.all([loadMembershipSpends(membership.id), loadWaiversOfMembership(membership.id)]);
  const ledger = await ledgerOf(actor, membership, contract.contract);
  const customer = (await loadCustomers()).find((item) => item.id === membership.customerId);
  return {
    membershipId: membership.id, customerName: customer?.displayName ?? "Unknown customer", productCode: membership.productCode,
    cardId: membership.cardId, status: membership.status, financialHold: membership.financialHold, spends, refunds, waivers, ledger,
  };
}

export async function list(actor: Actor): Promise<MembershipPoints[]> {
  const memberships = (await loadMemberships()).filter((item) => item.cardId);
  const rows: MembershipPoints[] = [];
  for (const membership of memberships) {
    const row = await build(actor, membership);
    // Record scope: a membership the viewer may not see is simply absent, never a failed list (doc 09 §22).
    if (row) rows.push(row);
  }
  return rows;
}

export async function venues(actor: Actor) {
  requireOperation(actor, "stay-points.enter");
  const outlets = await listAll<{ id: string; name: string; type: string; status: string }>("outlets", "id name type status");
  return outlets.filter((outlet) => outlet.status === "active").map(({ id, name, type }) => ({ id, name, type: type as never }));
}

/** Finance or office staff record the bill's Official Receipt number; the system issues one when none is supplied. */
async function nextBillReference(date: string): Promise<string> {
  const [payments, unmatched, batches, igp, spends] = await Promise.all([
    listAll<{ documentNo: string | null }>("payments", "documentNo"),
    listAll<{ orNumber: string }>("unmatchedReceipts", "orNumber"),
    listAll<{ receipts: Array<{ referenceNo: string }> | null }>("receiptImportBatches", "receipts"),
    listAll<{ details: { receipts?: Array<{ documentNo: string | null }> } | null }>("igpSales", "details"),
    listAll<{ verificationRef: string | null }>("resortSpends", "verificationRef"),
  ]);
  const existing = [
    ...payments.map((row) => ({ documentNo: row.documentNo })),
    ...unmatched.map((row) => ({ documentNo: row.orNumber })),
    ...batches.flatMap((batch) => (batch.receipts ?? []).map((receipt) => ({ documentNo: receipt.referenceNo }))),
    ...igp.flatMap((sale) => (sale.details?.receipts ?? []).map((receipt) => ({ documentNo: receipt.documentNo }))),
    ...spends.map((row) => ({ documentNo: row.verificationRef })),
  ];
  return nextOfficialReceiptNo(existing, date, (reference) => existing.some((row) => row.documentNo === reference));
}

/** Bill entry, approval, refund and Compassionate Waiver actions (doc 09 §11–14). */
export async function act(actor: Actor, input: StayPointsAction): Promise<MembershipPoints> {
  switch (input.action) {
    case "enter": {
      requireOperation(actor, "stay-points.enter");
      const membership = await loadVisibleMembershipFor(actor, input.membershipId);
      const contract = (await loadContract(membership.contractId))!.contract;
      if (!membership.cardId) throw conflict("no_card", "The membership has no VIP Number.");
      if (!parseManilaDateOnly(input.date) || input.date > today()) throw invalid("Enter a valid bill date on or before today.", { date: "Enter a valid bill date on or before today." });
      const outlet = (await listAll<{ id: string; status: string }>("outlets", "id status")).find((row) => row.id === input.venueId && row.status === "active");
      if (!outlet) throw invalid("Select an AFhomes Direct Operation.", { venueId: "Select an AFhomes Direct Operation." });
      const allowsSupplementary = (contract.benefits?.supplementaryHolders ?? 0) > 0;
      if (input.holder !== "primary" && !(input.holder === "supplementary" && allowsSupplementary)) {
        throw invalid("Only a membership whose product allows an extra cardholder can use extra cardholder spend.");
      }
      if (![input.grossCentavos, input.excludedCentavos].every(Number.isSafeInteger) || input.grossCentavos <= 0
        || input.excludedCentavos < 0 || input.excludedCentavos >= input.grossCentavos) {
        throw invalid("Enter a positive gross amount and exclusions below the gross amount.");
      }
      const supplied = input.reference?.trim() ?? "";
      if (supplied && await paperNumberTaken(supplied)) throw conflict("duplicate_number", "This official receipt number is already used.");
      const reference = supplied || await nextBillReference(input.date);
      const id = newId();
      await transact(actor, {
        variableDefinitions: "$d: ResortSpend_Data!",
        fields: "bill: resortSpend_insert(data: $d)",
        variables: {
          d: {
            id, membershipId: membership.id, venueId: input.venueId, date: input.date,
            grossCentavos: centavosToInt64(input.grossCentavos), excludedCentavos: centavosToInt64(input.excludedCentavos),
            amountCentavos: centavosToInt64(input.grossCentavos - input.excludedCentavos),
            status: "submitted", verificationRef: reference, holder: input.holder, description: input.description.trim(),
            enteredById: actor.userId, refunds: [],
          },
        },
        audit: [{ action: BUSINESS_AUDIT_ACTIONS.RESORT_BILL_ENTERED, entityType: "resort-spend", entityId: id, details: { module: "stay-points", displayReference: reference, newValue: "submitted", relatedRecordIds: [membership.id] } }],
      });
      return (await build(actor, (await loadMembership(membership.id))!))!;
    }
    case "approve": {
      requireOperation(actor, "stay-points.approve");
      const spend = await loadSpendRow(input.spendId);
      const membership = await loadVisibleMembershipFor(actor, spend.membershipId);
      if (spend.status === "submitted") {
        await transact(actor, {
          variableDefinitions: "$id: UUID!, $by: UUID!, $at: Date!",
          fields: 'row: resortSpend_updateMany(where: { id: { eq: $id }, status: { eq: "submitted" } }, data: { status: "verified", approvedById: $by, approvedDate: $at })\nquery @redact { s: resortSpend(id: $id) @check(expr: "response.row == 1", message: "ALREADY_DECIDED") { id } }',
          variables: { id: spend.id, by: actor.userId, at: today() },
          audit: [{ action: BUSINESS_AUDIT_ACTIONS.RESORT_BILL_APPROVED, entityType: "resort-spend", entityId: spend.id, details: { module: "stay-points", displayReference: spend.verificationRef, previousValue: "submitted", newValue: "verified", relatedRecordIds: [membership.id], reason: spend.enteredBy === actor.userId ? "Self-approval. The approver also entered this bill." : undefined } }],
          markers: { ALREADY_DECIDED: conflict("already_decided", "This bill was decided by someone else.") },
        });
      } else if (spend.status !== "verified") {
        throw conflict("not_approvable", "Only submitted resort bills can be approved.");
      }
      // A bill approved late still releases a due tranche on its approval date (owner ruling 2026-11-19);
      // ledgerOf persists the release and its audit.
      await ledgerOf(actor, membership, (await loadContract(membership.contractId))!.contract);
      return (await build(actor, membership))!;
    }
    case "refund": {
      requireOperation(actor, "stay-points.refund");
      const spend = await loadSpendRow(input.spendId);
      const membership = await loadVisibleMembershipFor(actor, spend.membershipId);
      if (spend.status !== "verified") throw conflict("not_verified", "Only approved resort bills can be refunded.");
      if (!parseManilaDateOnly(input.date) || input.date < spend.date || input.date > today()) throw invalid("Enter a refund date from the bill date through today.", { date: "Enter a refund date from the bill date through today." });
      const refunded = spend.refunds.reduce((sum, item) => sum + Number(item.amountCentavos), 0);
      if (!Number.isSafeInteger(input.amountCentavos) || input.amountCentavos <= 0 || input.amountCentavos > spend.amountCentavos - refunded) {
        throw invalid("The refund must be positive and cannot exceed the remaining qualifying amount.");
      }
      const reason = input.reason.trim();
      if (!reason) throw invalid("Enter a reason for the refund.", { reason: "Enter a reason for the refund." });
      const refunds = [...spend.refunds, { id: newId(), spendId: spend.id, date: input.date, amountCentavos: input.amountCentavos, reason, actorId: actor.userId }];
      await transact(actor, {
        variableDefinitions: "$id: UUID!, $refunds: Any!",
        fields: "row: resortSpend_updateMany(where: { id: { eq: $id } }, data: { refunds: $refunds })",
        variables: { id: spend.id, refunds },
        audit: [{ action: BUSINESS_AUDIT_ACTIONS.RESORT_BILL_REFUNDED, entityType: "resort-spend", entityId: spend.id, details: { module: "stay-points", displayReference: spend.verificationRef, newValue: String(input.amountCentavos), reason, relatedRecordIds: [membership.id] } }],
      });
      return (await build(actor, membership))!;
    }
    case "request-waiver": {
      requireOperation(actor, "stay-points.waiver");
      const membership = await loadVisibleMembershipFor(actor, input.membershipId);
      const ledger = await ledgerOf(actor, membership, (await loadContract(membership.contractId))!.contract);
      const tranche = ledger?.tranches.find((item) => item.number === input.tranche);
      if (!tranche || tranche.releaseDate || tranche.status === "forfeited") throw conflict("not_eligible", "Select a yearly gift that is still eligible for an exception.");
      if (!parseManilaDateOnly(input.date) || input.date <= tranche.dueDate || input.date > (addDaysToDate(tranche.dueDate, 60) ?? tranche.dueDate) || input.date > today()) {
        throw invalid("Record the written request received within 60 days after the affected gift year ended.", { date: "Record the written request received within 60 days after the affected gift year ended." });
      }
      if (!WAIVER_GROUNDS.includes(input.ground) || !input.supportingReference.trim()) throw invalid("Select a valid ground and enter the supporting document reference.");
      const waivers = await loadWaiversOfMembership(membership.id);
      if (waivers.some((item) => item.tranche === input.tranche && item.decision?.granted !== false)) throw conflict("waiver_exists", "An exception request for this yearly gift already exists.");
      const id = newId();
      await transact(actor, {
        variableDefinitions: "$d: StayPointsWaiver_Data!",
        fields: "waiver: stayPointsWaiver_insert(data: $d)",
        variables: { d: { id, membershipId: membership.id, tranche: input.tranche, date: input.date, ground: input.ground, supportingReference: input.supportingReference.trim(), requestedById: actor.userId } },
        audit: [{ action: BUSINESS_AUDIT_ACTIONS.COMPASSIONATE_WAIVER_REQUESTED, entityType: "membership", entityId: membership.id, details: { module: "stay-points", displayReference: membership.cardId, newValue: String(input.tranche), reason: input.ground, relatedRecordIds: [id] } }],
      });
      return (await build(actor, membership))!;
    }
    case "decide-waiver": {
      requireOperation(actor, "stay-points.waiver");
      const waiverRow = await dbRead<{ stayPointsWaiver: { id: string; membership: { id: string } | null; tranche: number; decision: unknown } | null }>(
        `query($id: UUID!) { stayPointsWaiver(id: $id) { id membership { id } tranche decision } }`, { id: input.waiverId });
      const waiver = waiverRow.stayPointsWaiver;
      if (!waiver || waiver.decision) throw conflict("not_pending", "Select a pending exception request.");
      const membership = await loadVisibleMembershipFor(actor, waiver.membership?.id ?? "");
      const ledger = await ledgerOf(actor, membership, (await loadContract(membership.contractId))!.contract);
      const tranche = ledger?.tranches.find((item) => item.number === waiver.tranche);
      if (input.granted && (!tranche || tranche.releaseDate || tranche.status === "forfeited" || !membership.validityEndDate)) {
        throw conflict("not_eligible", "This yearly gift can no longer be given by exception.");
      }
      if (input.granted && (!input.releaseDate || !parseManilaDateOnly(input.releaseDate) || input.releaseDate <= today() || input.releaseDate >= membership.validityEndDate!)) {
        throw invalid("Enter the next administrative cycle date before expiry.", { releaseDate: "Enter the next administrative cycle date before expiry." });
      }
      const reason = input.reason.trim();
      if (!reason) throw invalid("Enter a written decision reason.", { reason: "Enter a written decision reason." });
      const decision = { granted: input.granted, date: today(), actorId: actor.userId, reason, releaseDate: input.granted ? input.releaseDate : null };
      await transact(actor, {
        variableDefinitions: "$id: UUID!, $d: Any!",
        fields: 'row: stayPointsWaiver_updateMany(where: { id: { eq: $id }, decision: { isNull: true } }, data: { decision: $d })\nquery @redact { w: stayPointsWaiver(id: $id) @check(expr: "response.row == 1", message: "ALREADY_DECIDED") { id } }',
        variables: { id: waiver.id, d: decision },
        audit: [{ action: input.granted ? BUSINESS_AUDIT_ACTIONS.COMPASSIONATE_WAIVER_GRANTED : BUSINESS_AUDIT_ACTIONS.COMPASSIONATE_WAIVER_REFUSED, entityType: "membership", entityId: membership.id, details: { module: "stay-points", displayReference: membership.cardId, newValue: String(waiver.tranche), reason, relatedRecordIds: [waiver.id] } }],
        markers: { ALREADY_DECIDED: conflict("already_decided", "This exception was decided by someone else.") },
      });
      // A granted waiver releases its tranche in the next administrative cycle; the ledger records it.
      await ledgerOf(actor, membership, (await loadContract(membership.contractId))!.contract);
      return (await build(actor, membership))!;
    }
    default:
      throw invalid("Choose a valid Stay Points action.");
  }
}

type SpendRow = { id: string; membershipId: string; date: string; amountCentavos: number; status: string; verificationRef: string | null; enteredBy: string | null; refunds: Array<Record<string, unknown>> };

async function loadSpendRow(id: string): Promise<SpendRow> {
  const result = await dbRead<{ resortSpend: { id: string; membership: { id: string } | null; date: string; amountCentavos: string; status: string; verificationRef: string | null; enteredBy: { id: string } | null; refunds: unknown } | null }>(
    `query($id: UUID!) { resortSpend(id: $id) { id membership { id } date amountCentavos status verificationRef enteredBy { id } refunds } }`, { id });
  const row = result.resortSpend;
  if (!row) throw notFound("Resort bill");
  return {
    id: row.id, membershipId: row.membership?.id ?? "", date: row.date, amountCentavos: int64ToCentavos(row.amountCentavos),
    status: row.status, verificationRef: row.verificationRef, enteredBy: row.enteredBy?.id ?? null,
    refunds: (row.refunds as unknown as Array<Record<string, unknown>>) ?? [],
  };
}

async function loadVisibleMembershipFor(actor: Actor, membershipId: string): Promise<Membership> {
  const membership = await loadMembership(membershipId);
  if (!membership) throw notFound("Membership");
  const contract = await loadContract(membership.contractId);
  if (!contract || !canSeeContractRecord(actor.identity, contract.contract)) throw notFound("Membership");
  return membership;
}

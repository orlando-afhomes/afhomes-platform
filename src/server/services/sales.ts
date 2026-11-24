import "server-only";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { canSeeContractRecord } from "@/modules/identity/record-scope";
import type { Sale } from "@/modules/sales/types";
import type { Actor } from "@/server/auth/actor";
import { requireOperation } from "@/server/auth/authorize";
import { loadContract, loadSale } from "@/server/repositories/records";
import { conflict, notFound, nowIso, transact } from "@/server/services/common";

/** Administrator or Super Administrator approves a recorded sale; receipts can be verified only after this (doc 07, 13). */
export async function approveSale(actor: Actor, id: string): Promise<Sale> {
  requireOperation(actor, "contracts.approve");
  const sale = await loadSale(id);
  const contract = sale ? await loadContract(sale.contractId) : null;
  if (!sale || !contract || !canSeeContractRecord(actor.identity, contract.contract)) throw notFound("Sale");
  if (sale.status === "cancelled" || sale.status === "rejected") throw conflict("sale_closed", "This sale cannot be approved.");
  if (sale.approval) return sale;
  try {
    await transact(actor, {
      variableDefinitions: "$id: UUID!, $by: UUID!, $at: Timestamp!",
      fields: `upd: sale_updateMany(where: { id: { eq: $id }, approvedAt: { isNull: true } }, data: { approvedById: $by, approvedAt: $at })
query @redact { sale(id: $id) @check(expr: "response.upd == 1", message: "ALREADY_APPROVED") { id } }`,
      variables: { id: sale.id, by: actor.userId, at: nowIso() },
      audit: [{ action: BUSINESS_AUDIT_ACTIONS.SALE_APPROVED, entityType: "sale", entityId: sale.id, details: { module: "sales", newValue: "approved", relatedRecordIds: [sale.contractId] } }],
      markers: { ALREADY_APPROVED: conflict("sale_changed", "This sale was approved by someone else.") },
    });
  } catch (error) {
    // Two approvals at once: the second finds it already approved, which is the result it wanted.
    const latest = await loadSale(id);
    if (latest?.approval) return latest;
    throw error;
  }
  return (await loadSale(id))!;
}

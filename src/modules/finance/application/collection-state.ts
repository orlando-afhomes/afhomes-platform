import type { Contract } from "@/modules/contracts/types";
import type { Payment } from "../types";
import type { Sale } from "@/modules/sales/types";
import { VIP_CLOSED_DEAL_THRESHOLD_BP } from "@/modules/sales/rules";
import { approvedCollectionMilestone, isFullySettled } from "../rules";

/** Read-only collection facts shared by reconciliation adapters; no lifecycle changes. */
export function collectionState(
  contract: Pick<Contract, "priceCentavos">,
  payments: readonly Payment[],
  sale?: Pick<Sale, "valueCentavos" | "closedDealThresholdBp">,
) {
  return {
    settled: isFullySettled(contract, payments),
    confirmation: sale ? approvedCollectionMilestone(sale.valueCentavos, payments, sale.closedDealThresholdBp ?? VIP_CLOSED_DEAL_THRESHOLD_BP) : null,
    release: sale ? approvedCollectionMilestone(sale.valueCentavos, payments, 4_000) : null,
    fullPayment: sale ? approvedCollectionMilestone(sale.valueCentavos, payments, 10_000) : null,
  };
}

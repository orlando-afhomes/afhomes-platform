import type { ContractRepository, ContractView } from "@/data/contracts/contract-repository";
import type { CustomerRepository } from "@/data/contracts/customer-repository";
import type { SaleRepository } from "@/data/contracts/sale-repository";

type DealRepositories = {
  customers: Pick<CustomerRepository, "getById" | "approve">;
  sales: Pick<SaleRepository, "list" | "approve">;
  contracts: Pick<ContractRepository, "getById" | "recordSignedAgreement" | "finalize">;
};

export type ApproveDealOutcome = {
  contract: ContractView;
  customerApproved: boolean;
  saleApproved: boolean;
  vipNumberIssued: boolean;
  finalized: boolean;
  /** Reasons finalization is still held; the VIP Number is issued but the contract stays in review. */
  finalizeHeld: string[];
};

const ALREADY_APPROVED_CUSTOMER = new Set(["approved", "active_member"]);

/**
 * One Administrator action for a deal whose signed Reservation Agreement is on file
 * (owner decision 2026-11-16). It runs the existing steps in order, each keeping its
 * own status change and audit entry: approve the customer (doc 04 section 5), approve
 * the sale, record the signed agreement which issues the VIP Number (doc 06), and
 * finalize the contract when nothing holds it (doc 05). Every step is skipped when
 * already done, so after a failure partway, running it again resumes where it stopped.
 */
export async function approveDeal(repositories: DealRepositories, contractId: string): Promise<ApproveDealOutcome> {
  const contract = await repositories.contracts.getById(contractId);
  if (!contract) throw new Error("Contract not found.");

  // Preconditions are checked before anything changes.
  if (!["submitted", "under_review", "finalized"].includes(contract.status)) throw new Error("Only a submitted contract can be approved.");
  if (contract.cancellation?.status === "requested") throw new Error("A cancellation is awaiting Finance confirmation. Approve the deal after Finance decides.");
  const missingRate = contract.missingCommissionRates[0];
  if (missingRate) {
    throw new Error(`Record the approved ${missingRate.role} rate for ${missingRate.memberName ?? (missingRate.role === "DSC" ? "the closing seller" : "the referrer")} before approving the deal.`);
  }
  const customer = await repositories.customers.getById(contract.customerId);
  if (!customer) throw new Error("Customer not found.");
  if (customer.status !== "submitted" && !ALREADY_APPROVED_CUSTOMER.has(customer.status)) throw new Error("The customer registration must be submitted before the deal can be approved.");
  const sale = (await repositories.sales.list()).find((item) => item.contractId === contract.id);
  if (!sale) throw new Error("This contract has no recorded sale.");
  if (sale.status === "cancelled" || sale.status === "rejected") throw new Error("This sale cannot be approved.");

  const customerApproved = customer.status === "submitted";
  if (customerApproved) await repositories.customers.approve(customer.id);

  const saleApproved = !sale.approval;
  if (saleApproved) await repositories.sales.approve(sale.id);

  let current = contract;
  const vipNumberIssued = !current.vipNumber;
  if (vipNumberIssued) current = await repositories.contracts.recordSignedAgreement(current.id);

  let finalized = false;
  let finalizeHeld: string[] = [];
  if (current.status !== "finalized") {
    if (current.holds.length > 0) {
      finalizeHeld = current.holds;
    } else {
      current = await repositories.contracts.finalize(current.id);
      finalized = true;
    }
  }

  return { contract: current, customerApproved, saleApproved, vipNumberIssued, finalized, finalizeHeld };
}

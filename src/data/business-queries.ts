"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { CommissionRateSetting } from "@/modules/commissions/types";
import type { AllowanceReviewInput } from "@/modules/commissions/allowances";
import type { PrepareContractInput, UpdateContractInput } from "@/data/contracts/contract-repository";
import type { PaymentSchemeInput, ProductCreateInput, ProductUpdateInput } from "@/data/contracts/product-repository";
import type { ReportExportInput } from "@/data/contracts/report-repository";
import type { SubmitPaymentInput } from "@/data/contracts/payment-repository";
import type { StayPointsAction } from "@/data/contracts/stay-points-repository";
import type { MockRepositories } from "@/data/mock/repositories";
import { useMockRepositories } from "@/data/queries";
import { queryKeys } from "@/data/query-keys";
import type { ContractCancellationGround } from "@/modules/contracts/types";
import { registerCustomer, type CustomerRegistrationInput } from "@/modules/customers/application/register-customer";
import type { CustomerImportRecord } from "@/modules/customers/import";
import type { CustomerDraftInput } from "@/modules/customers/types";
import type { VipTierCode } from "@/modules/vip/types";
import type { CardServiceInput } from "@/modules/membership/types";
import { hasOperationPermission, type AdminOperation } from "@/modules/identity/permissions";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";

/**
 * Business-module hooks (customers through stay points). Every query key is
 * partitioned by the active dev identity so one identity's records never appear
 * under another. Mutations refresh every business view, because one workflow
 * step (a payment verification, for example) moves sales, holds and commissions.
 */
function invalidateBusiness(queryClient: QueryClient) {
  for (const key of [queryKeys.business.all, ["customers"], ["products"], queryKeys.audit.all]) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}

function useBusinessQuery<T>(namespace: string, load: (repositories: MockRepositories, signal?: AbortSignal) => Promise<T>) {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: queryKeys.business.list(namespace, identity.id),
    queryFn: ({ signal }) => load(repositories, signal),
  });
}

function useBusinessMutation<V, R>(run: (repositories: MockRepositories, variables: V) => Promise<R>) {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: V) => run(repositories, variables),
    onSuccess: () => invalidateBusiness(queryClient),
  });
}

// Customers
export function useRegisterCustomer() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerRegistrationInput) => registerCustomer(repositories, input),
    // A failed registration can still leave a saved draft or a prepared contract.
    onSettled: () => invalidateBusiness(queryClient),
  });
}

export function useUpdateCustomerDraft() {
  return useBusinessMutation((r, v: { id: string; input: CustomerDraftInput }) => r.customers.updateDraft(v.id, v.input));
}
export function useDiscardCustomerDraft() {
  return useBusinessMutation((r, id: string) => r.customers.discardDraft(id));
}
export function useSubmitCustomer() {
  return useBusinessMutation((r, v: { id: string; input: CustomerDraftInput }) => r.customers.submit(v.id, v.input));
}
export function useApproveCustomer() {
  return useBusinessMutation((r, id: string) => r.customers.approve(id));
}
export function useSendBackCustomer() {
  return useBusinessMutation((r, v: { id: string; reason: string }) => r.customers.sendBack(v.id, v.reason));
}
export function useRejectCustomer() {
  return useBusinessMutation((r, v: { id: string; reason: string }) => r.customers.reject(v.id, v.reason));
}
export function useCustomerImportJobs(enabled: boolean) {
  return useBusinessQuery("customer-imports", (r, signal) => (enabled ? r.customers.listImportJobs({ signal }) : Promise.resolve([])));
}
export function useImportCustomers() {
  return useBusinessMutation((r, v: { fileName: string; records: CustomerImportRecord[]; declaration: boolean }) => r.customers.importCustomers(v));
}
export function useExportCustomers() {
  return useBusinessMutation((r, v: { format: "xlsx" | "csv"; count: number }) => r.customers.exportCustomers(v));
}
export function useRecordReportExport() {
  return useBusinessMutation((r, v: ReportExportInput) => r.reports.recordExport(v));
}
export function useCorrectCustomer() {
  return useBusinessMutation((r, v: { id: string; input: CustomerDraftInput; reason: string }) => r.customers.correct(v.id, v.input, v.reason));
}

// VIP products and schemes
export function useVipProducts() {
  return useBusinessQuery("products", (r, signal) => r.products.list({ signal }));
}
export function usePaymentSchemes() {
  return useBusinessQuery("schemes", (r, signal) => r.products.listSchemes({ signal }));
}
export function useUpdateProduct() {
  return useBusinessMutation((r, v: { code: VipTierCode; input: ProductUpdateInput; reason: string }) => r.products.update(v.code, v.input, v.reason));
}
export function useCreateProduct() {
  return useBusinessMutation((r, v: { input: ProductCreateInput; reason: string }) => r.products.create(v.input, v.reason));
}
export function useDeleteProduct() {
  return useBusinessMutation((r, v: { code: VipTierCode; reason: string }) => r.products.delete(v.code, v.reason));
}
/** Per product code: why it cannot be deleted, or null when unused. */
export function useProductDeleteBlockers() {
  return useBusinessQuery("product-delete-blockers", (r, signal) => r.products.deleteBlockers({ signal }));
}
export function useCreatePaymentScheme() {
  return useBusinessMutation((r, input: PaymentSchemeInput & { label: string }) => r.products.createScheme(input));
}
export function useUpdatePaymentScheme() {
  return useBusinessMutation((r, v: { id: string; input: PaymentSchemeInput; reason: string }) => r.products.updateScheme(v.id, v.input, v.reason));
}

// Contracts
export function useContracts() {
  return useBusinessQuery("contracts", (r, signal) => r.contracts.list({ signal }));
}
export function usePrepareContract() {
  return useBusinessMutation((r, input: PrepareContractInput) => r.contracts.prepare(input));
}
export function useUpdateContract() {
  return useBusinessMutation((r, v: { id: string; input: UpdateContractInput }) => r.contracts.update(v.id, v.input));
}
export type ContractAction =
  | { id: string; action: "submit" | "startReview" | "finalize" }
  | { id: string; action: "return" | "cancel"; reason: string }
  | { id: string; action: "ra" }
  | { id: string; action: "requestCancel"; ground: ContractCancellationGround; reason: string }
  | { id: string; action: "decideCancel"; decision: "confirm" | "decline"; reason: string }
  | { id: string; action: "approveArrangement"; reference: string }
  | { id: string; action: "resolvePaymentCode"; reference: string };
export function useContractAction() {
  return useBusinessMutation((r, v: ContractAction) => {
    switch (v.action) {
      case "submit": return r.contracts.submit(v.id);
      case "startReview": return r.contracts.startReview(v.id);
      case "finalize": return r.contracts.finalize(v.id);
      case "return": return r.contracts.returnForCorrection(v.id, v.reason);
      case "cancel": return r.contracts.cancel(v.id, v.reason);
      case "ra": return r.contracts.recordSignedAgreement(v.id);
      case "requestCancel": return r.contracts.requestCancellation(v.id, v.ground, v.reason);
      case "decideCancel": return r.contracts.decideCancellation(v.id, v.decision, v.reason);
      case "approveArrangement": return r.contracts.approveArrangement(v.id, v.reference);
      case "resolvePaymentCode": return r.contracts.resolvePaymentCode(v.id, v.reference);
    }
  });
}

// Sales
export function useSales() {
  return useBusinessQuery("sales", (r, signal) => r.sales.list({ signal }));
}
export function useApproveSale() {
  return useBusinessMutation((r, id: string) => r.sales.approve(id));
}
export function useMarkSaleDefaulted() {
  return useBusinessMutation((r, input: { id: string; reason: string }) => r.sales.markDefaulted(input.id, input.reason));
}
export function useClosedMonths() {
  return useBusinessQuery("closed-months", (r, signal) => r.sales.listClosedMonths({ signal }));
}
export function useCloseMonth() {
  return useBusinessMutation((r, month: string) => r.sales.closeMonth(month));
}

// Payments
export function usePayments() {
  return useBusinessQuery("payments", (r, signal) => r.payments.list({ signal }));
}
export function useSubmitPayment() {
  return useBusinessMutation((r, input: SubmitPaymentInput) => r.payments.submit(input));
}
export type PaymentAction =
  | { id: string; action: "startReview" }
  | { id: string; action: "verify"; exceptionReason?: string }
  | { id: string; action: "reject" | "return"; reason: string }
  | { id: string; action: "adjust"; kind: "reversal" | "refund"; amountCentavos: number; reason: string }
  | { id: string; action: "resubmit"; input: Partial<Omit<SubmitPaymentInput, "contractId">> };
export function usePaymentAction() {
  return useBusinessMutation((r, v: PaymentAction) => {
    switch (v.action) {
      case "startReview": return r.payments.startReview(v.id);
      case "verify": return r.payments.verify(v.id, { exceptionReason: v.exceptionReason });
      case "reject": return r.payments.reject(v.id, v.reason);
      case "return": return r.payments.returnForCorrection(v.id, v.reason);
      case "adjust": return r.payments.adjust(v.id, { kind: v.kind, amountCentavos: v.amountCentavos, reason: v.reason });
      case "resubmit": return r.payments.resubmit(v.id, v.input);
    }
  });
}

// Memberships
export function useMemberships() {
  return useBusinessQuery("memberships", (r, signal) => r.memberships.list({ signal }));
}
export function useActivateMembership() {
  return useBusinessMutation((r, id: string) => r.memberships.activate(id));
}
export function useRecordCardClaim() {
  return useBusinessMutation((r, id: string) => r.memberships.recordCardClaim(id));
}
export function useServiceCard() {
  return useBusinessMutation((r, input: { id: string; service: CardServiceInput }) => r.memberships.serviceCard(input.id, input.service));
}

// Commissions
export function useCommissions() {
  return useBusinessQuery("commissions", (r, signal) => r.commissions.list({ signal }));
}
function useCommissionQuery<T>(namespace: string, enabled: boolean, load: (r: MockRepositories, signal: AbortSignal) => Promise<T>) {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: queryKeys.business.list(namespace, identity.id),
    queryFn: ({ signal }) => load(repositories, signal),
    enabled,
  });
}

export function useCommissionRates(enabled: boolean) {
  return useCommissionQuery("commission-rates", enabled, (r, signal) => r.commissions.rateDirectory({ signal }));
}

export function useSaveCommissionRate() {
  return useBusinessMutation((r, input: CommissionRateSetting & { reason: string }) => r.commissions.setRate(input));
}

export function useCommissionPayoutLists(enabled: boolean) {
  return useCommissionQuery("commission-payout-lists", enabled, (r, signal) => r.commissions.payoutLists({ signal }));
}

export function useCommissionPayoutListAction() {
  return useBusinessMutation((r, input: { kind: "prepare"; month: string } | { kind: "approve"; id: string }) => (
    input.kind === "prepare" ? r.commissions.preparePayoutList(input.month) : r.commissions.approvePayoutList(input.id)
  ));
}

export function useCommissionClawbacks(enabled: boolean) {
  return useCommissionQuery("commission-clawbacks", enabled, (r, signal) => r.commissions.clawbacks({ signal }));
}

export function useCommissionClawbackAction() {
  return useBusinessMutation((r, input: { kind: "collect"; id: string; amountCentavos: number; reference: string } | { kind: "writeOff"; id: string; reason: string }) => (
    input.kind === "collect" ? r.commissions.recordRecovery(input.id, input) : r.commissions.writeOff(input.id, input.reason)
  ));
}

export function useAllowanceReviews(enabled: boolean) {
  return useCommissionQuery("allowance-reviews", enabled, (r, signal) => r.commissions.allowanceReviews({ signal }));
}

export function useSaveAllowanceReview() {
  return useBusinessMutation((r, input: AllowanceReviewInput) => r.commissions.saveAllowanceReview(input));
}
export type CommissionAction =
  | { id: string; action: "adjust"; percentBp: number; reason: string }
  | { id: string; action: "hold"; decision: "keep" | "cancel" | "restore"; reason: string }
  | { id: string; action: "cancel"; reason: string }
  | { id: string; action: "payout"; reference: string; method: string | null; payoutDate: string; evidenceFileName?: string }
  | { id: string; action: "void"; reason: string }
  | { id: string; action: "confirm" };
export function useCommissionAction() {
  return useBusinessMutation((r, v: CommissionAction) => {
    switch (v.action) {
      case "adjust": return r.commissions.adjust(v.id, v.percentBp, v.reason);
      case "hold": return r.commissions.resolveHold(v.id, v.decision, v.reason);
      case "cancel": return r.commissions.cancel(v.id, v.reason);
      case "payout": return r.commissions.recordPayout(v.id, v);
      case "void": return r.commissions.voidPayout(v.id, v.reason);
      case "confirm": return r.commissions.confirmPayout(v.id);
    }
  });
}

// Stay points
export function useStayPoints() {
  return useBusinessQuery("stay-points", (r, signal) => r.stayPoints.list({ signal }));
}
export function useStayPointsVenues(enabled: boolean) {
  return useBusinessQuery("stay-points-venues", (r, signal) => enabled ? r.stayPoints.venues({ signal }) : Promise.resolve([]));
}
export function useStayPointsAction() {
  return useBusinessMutation((r, input: StayPointsAction) => r.stayPoints.act(input));
}

/** Whether the active identity holds an operation grant (presentation only; repositories enforce it). */
export function useOperation(operation: AdminOperation): boolean {
  const { identity } = useDevIdentity();
  return identity.status === "active" && hasOperationPermission(identity, operation);
}

import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { AccountRepository } from "@/data/contracts/account-repository";
import type { AccreditationRepository, AaNumberResolution, PublicAccreditationResult } from "@/data/contracts/accreditation-repository";
import { CustomerValidationError, type CustomerPage, type CustomerRepository } from "@/data/contracts/customer-repository";
import type { ContractRepository, ContractView } from "@/data/contracts/contract-repository";
import type { DepartmentRepository } from "@/data/contracts/department-repository";
import type { ExperienceRepository } from "@/data/contracts/experience-repository";
import type { MemberRepository, UplineSummary } from "@/data/contracts/member-repository";
import type { OutletRepository, OutletView } from "@/data/contracts/outlet-repository";
import type { PaymentRepository, PaymentView, SubmitPaymentInput, UnmatchedReceiptView } from "@/data/contracts/payment-repository";
import type { ReferenceEntryView, ReferenceListRepository } from "@/data/contracts/reference-list-repository";
import type { ProductRepository } from "@/data/contracts/product-repository";
import type { TierLevelRepository, TierLevelView } from "@/data/contracts/tier-level-repository";
import type { HistoryImportRepository } from "@/data/contracts/history-import-repository";
import type { MembershipRepository, MembershipView, CustomerLookupResult } from "@/data/contracts/membership-repository";
import type { MembershipPoints, StayPointsOverview, StayPointsRepository } from "@/data/contracts/stay-points-repository";
import type { ReceiptImportBatch } from "@/modules/imports/receipt-import";
import type { RegistrationRepository, RegistrationCorrectionView } from "@/data/contracts/registration-repository";
import type { ReportRepository } from "@/data/contracts/report-repository";
import type { Repositories } from "@/data/contracts/repositories";
import type { DepartmentRoleRepository } from "@/data/contracts/role-repository";
import type { SaleRepository, SaleView } from "@/data/contracts/sale-repository";
import type { ClosedMonth } from "@/modules/finance/month-close";
import type { StaffRepository } from "@/data/contracts/staff-repository";
import { getCurrentAccreditationRecord } from "@/modules/accreditation/eligibility";
import type { AccreditationRecord, RegistrationApplication } from "@/modules/accreditation/types";
import type { Account, AccountPolicies, AccountStatus } from "@/modules/accounts/types";
import type { Customer, CustomerDraftInput } from "@/modules/customers/types";
import type { CustomerImportJob } from "@/modules/customers/import";
import type { Experience } from "@/modules/experiences/types";
import type { IgpCatalogRepository, IgpCatalog, IgpProjectView, IgpUnitView } from "@/data/contracts/igp-catalog-repository";
import type { IgpRegister, IgpRepository } from "@/data/contracts/igp-repository";
import type { CommissionRateDirectory, CommissionRepository, CommissionView } from "@/data/contracts/commission-repository";
import type { CommissionClawback, CommissionPayoutList } from "@/modules/commissions/types";
import type { IgpHistoryBatch, IgpSale } from "@/modules/igp/types";
import type { Department, DepartmentRole, DepartmentRoleOption, OrgMember, StaffMember } from "@/modules/organization/types";
import type { AccreditedSellerResult, ReferralSponsorVerificationResult } from "@/modules/sales-network/types";
import type { SeatVacancy } from "@/modules/sales-network/vacancy";
import type { Outlet, ReferenceEntry } from "@/modules/settings/lists";
import type { PaymentScheme, VipProduct } from "@/modules/vip/types";
import { ApiRequestError, NotConnectedError, apiFetch, fetchAllPages, fetchOrNull } from "./client";

const signalOf = (options?: MockAsyncOptions) => options?.signal;

/**
 * A repository the real backend only partly serves. Any method that is not implemented rejects with
 * NotConnectedError, so a screen outside the pilot shows its normal error state and never mixes in sample data.
 */
function partial<T extends object>(name: string, implemented: Partial<T>): T {
  return new Proxy(implemented, {
    get(target, property) {
      if (property in target) return (target as Record<string | symbol, unknown>)[property];
      if (typeof property === "symbol" || property === "then") return undefined;
      return () => Promise.reject(new NotConnectedError(`${name}.${property}`));
    },
  }) as T;
}

/** A 422 with field messages is the form's own validation error; anything else keeps the server's safe message. */
async function withFieldErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 422 && error.fields) throw new CustomerValidationError(error.fields);
    throw error;
  }
}

/** Splits a data-URL image out of the JSON body; it is uploaded to the private file endpoint after the save. */
function splitCustomerImages(input: CustomerDraftInput): { body: CustomerDraftInput; idImage?: { dataUrl: string; fileName: string } } {
  const supplementary = input.supplementaryHolder?.governmentIdImage;
  if (supplementary?.dataUrl?.startsWith("data:")) throw new Error("The extra cardholder's ID image is not connected to the real backend yet. Remove the image to continue.");
  const image = input.governmentIdImage;
  const data = image?.dataUrl?.startsWith("data:") ? image : null;
  const { governmentIdImage: _image, ...rest } = input;
  void _image;
  return { body: rest as CustomerDraftInput, ...(data ? { idImage: data } : {}) };
}

async function uploadCustomerIdImage(customerId: string, image: { dataUrl: string; fileName: string }): Promise<void> {
  const blob = await (await fetch(image.dataUrl)).blob();
  const form = new FormData();
  form.append("file", blob, image.fileName || "government-id");
  await apiFetch(`/customers/${customerId}/id-image`, { method: "POST", form });
}

const customerView = async (id: string) => (await apiFetch<{ customer: Customer }>(`/customers/${id}`)).customer;

const customers = (): Partial<CustomerRepository> => ({
  list: (options) => fetchAllPages<Customer>("/customers", 100, signalOf(options)),
  listPage: (query, options) => apiFetch<CustomerPage>(`/customers?limit=${query.limit}${query.afterId ? `&after=${query.afterId}` : ""}`, { signal: signalOf(options) }),
  getById: async (id, options) => (await fetchOrNull<{ customer: Customer }>(`/customers/${id}`, signalOf(options)))?.customer ?? null,
  createDraft: (input) =>
    withFieldErrors(async () => {
      const { body, idImage } = splitCustomerImages(input);
      const created = (await apiFetch<{ customer: Customer }>("/customers", { method: "POST", body })).customer;
      if (idImage) {
        try {
          await uploadCustomerIdImage(created.id, idImage);
          return customerView(created.id);
        } catch (error) {
          const reason = error instanceof Error ? error.message : "The upload failed.";
          throw new Error(`The draft was saved, but its ID image could not be uploaded: ${reason}`);
        }
      }
      return created;
    }),
  updateDraft: (id, input) =>
    withFieldErrors(async () => {
      const { body, idImage } = splitCustomerImages(input);
      const saved = (await apiFetch<{ customer: Customer }>(`/customers/${id}`, { method: "POST", body })).customer;
      if (idImage) {
        try {
          await uploadCustomerIdImage(id, idImage);
          return customerView(id);
        } catch (error) {
          const reason = error instanceof Error ? error.message : "The upload failed.";
          throw new Error(`The draft was saved, but its ID image could not be uploaded: ${reason}`);
        }
      }
      return saved;
    }),
  discardDraft: async (id) => {
    await apiFetch(`/customers/${id}/discard`, { method: "POST" });
  },
  submit: (id, input) =>
    withFieldErrors(async () => {
      const { body, idImage } = splitCustomerImages(input);
      if (idImage) await uploadCustomerIdImage(id, idImage);
      return (await apiFetch<{ customer: Customer }>(`/customers/${id}/submit`, { method: "POST", body })).customer;
    }),
  approve: async (id) => (await apiFetch<{ customer: Customer }>(`/customers/${id}/approve`, { method: "POST" })).customer,
  sendBack: async (id, reason) => (await apiFetch<{ customer: Customer }>(`/customers/${id}/send-back`, { method: "POST", body: { reason } })).customer,
  reject: async (id, reason) => (await apiFetch<{ customer: Customer }>(`/customers/${id}/reject`, { method: "POST", body: { reason } })).customer,
  correct: (id, input, reason) =>
    withFieldErrors(async () => {
      const { body, idImage } = splitCustomerImages(input);
      if (idImage) await uploadCustomerIdImage(id, idImage);
      return (await apiFetch<{ customer: Customer }>(`/customers/${id}/correct`, { method: "POST", body: { ...body, reason } })).customer;
    }),
  importCustomers: async (input) => (await apiFetch<{ job: CustomerImportJob }>("/customers/import", { method: "POST", body: input })).job,
  listImportJobs: async (options) => (await apiFetch<{ items: CustomerImportJob[] }>("/customers/imports", { signal: signalOf(options) })).items,
  exportCustomers: async (input) => (await apiFetch<{ items: Customer[] }>("/customers/export", { method: "POST", body: input })).items,
});

const contractView = async (id: string) => (await apiFetch<{ contract: ContractView }>(`/contracts/${id}`)).contract;
const saleView = async (id: string) => (await apiFetch<{ sale: SaleView }>(`/sales/${id}`)).sale;
const paymentView = async (id: string) => (await apiFetch<{ payment: PaymentView }>(`/payments/${id}`)).payment;

const contracts = (): Partial<ContractRepository> => ({
  list: (options) => fetchAllPages<ContractView>("/contracts", 500, signalOf(options)),
  getById: async (id, options) => (await fetchOrNull<{ contract: ContractView }>(`/contracts/${id}`, signalOf(options)))?.contract ?? null,
  prepare: async (input) => {
    const { contract } = await apiFetch<{ contract: { id: string } }>("/contracts", { method: "POST", body: input });
    return contractView(contract.id);
  },
  submit: async (id) => {
    await apiFetch(`/contracts/${id}/submit`, { method: "POST" });
    return contractView(id);
  },
  finalize: async (id) => {
    await apiFetch(`/contracts/${id}/finalize`, { method: "POST" });
    return contractView(id);
  },
  update: async (id, input) => {
    await apiFetch(`/contracts/${id}/update`, { method: "POST", body: input });
    return contractView(id);
  },
  returnForCorrection: async (id, reason) => {
    await apiFetch(`/contracts/${id}/return`, { method: "POST", body: { reason } });
    return contractView(id);
  },
  cancel: async (id, reason) => {
    await apiFetch(`/contracts/${id}/cancel`, { method: "POST", body: { reason } });
    return contractView(id);
  },
  requestCancellation: async (id, ground, reason) => {
    await apiFetch(`/contracts/${id}/cancellation-request`, { method: "POST", body: { ground, reason } });
    return contractView(id);
  },
  decideCancellation: async (id, decision, reason) => {
    await apiFetch(`/contracts/${id}/cancellation-decision`, { method: "POST", body: { decision, reason } });
    return contractView(id);
  },
  approveArrangement: async (id, reference) => {
    await apiFetch(`/contracts/${id}/arrangement`, { method: "POST", body: { reference } });
    return contractView(id);
  },
  approveNonStandard: async (id, reference) => {
    await apiFetch(`/contracts/${id}/non-standard-approve`, { method: "POST", body: { reference } });
    return contractView(id);
  },
  confirmNonStandard: async (id) => {
    await apiFetch(`/contracts/${id}/non-standard-confirm`, { method: "POST" });
    return contractView(id);
  },
  resolvePaymentCode: async (id, reference) => {
    await apiFetch(`/contracts/${id}/payment-code`, { method: "POST", body: { reference } });
    return contractView(id);
  },
  recordSignedAgreement: async (id) => {
    await apiFetch(`/contracts/${id}/signed-agreement`, { method: "POST" });
    return contractView(id);
  },
});

const sales = (): Partial<SaleRepository> => ({
  list: (options) => fetchAllPages<SaleView>("/sales", 500, signalOf(options)),
  getById: async (id, options) => (await fetchOrNull<{ sale: SaleView }>(`/sales/${id}`, signalOf(options)))?.sale ?? null,
  approve: async (id) => {
    await apiFetch(`/sales/${id}/approve`, { method: "POST" });
    return saleView(id);
  },
  correctCommission: async (id, input) => {
    await apiFetch(`/sales/${id}/correct-commission`, { method: "POST", body: input });
    return saleView(id);
  },
  markDefaulted: async (id, reason) => {
    await apiFetch(`/sales/${id}/default`, { method: "POST", body: { reason } });
    return saleView(id);
  },
  listClosedMonths: async (options) => (await apiFetch<{ items: ClosedMonth[] }>("/closed-months", { signal: signalOf(options) })).items,
  closeMonth: async (month) => (await apiFetch<{ month: ClosedMonth }>("/closed-months", { method: "POST", body: { month } })).month,
});

const historyImports = (): Partial<HistoryImportRepository> => ({
  listBatches: async (options) => (await apiFetch<{ items: ReceiptImportBatch[] }>("/history-import", { signal: signalOf(options) })).items,
  createBatch: async (input) => (await apiFetch<{ batch: ReceiptImportBatch }>("/history-import", { method: "POST", body: input })).batch,
  signOff: async (id) => (await apiFetch<{ batch: ReceiptImportBatch }>(`/history-import/${id}/sign-off`, { method: "POST" })).batch,
  reject: async (id, reason) => (await apiFetch<{ batch: ReceiptImportBatch }>(`/history-import/${id}/reject`, { method: "POST", body: { reason } })).batch,
});

/** Turns a receipt's data URL into a file and sends it to the private evidence endpoint. */
async function uploadEvidence(paymentId: string, dataUrl: string, fileName: string | null | undefined): Promise<void> {
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.append("file", blob, fileName?.trim() || "receipt");
  await apiFetch(`/payments/${paymentId}/evidence`, { method: "POST", form });
}

const payments = (): Partial<PaymentRepository> => ({
  list: (options) => fetchAllPages<PaymentView>("/payments", 500, signalOf(options)),
  submit: async (input: SubmitPaymentInput) => {
    const { payment } = await apiFetch<{ payment: { id: string } }>("/payments", {
      method: "POST",
      body: { contractId: input.contractId, purpose: input.purpose, amountCentavos: input.amountCentavos, method: input.method, paidDate: input.paidDate, documentNo: input.documentNo ?? undefined, evidenceFileName: input.evidenceFileName ?? undefined, bankId: input.bankId ?? undefined },
    });
    if (input.evidenceDataUrl) {
      try {
        await uploadEvidence(payment.id, input.evidenceDataUrl, input.evidenceFileName);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "The upload failed.";
        throw new Error(`The receipt was saved, but its file could not be uploaded: ${reason}`);
      }
    }
    return paymentView(payment.id);
  },
  verify: async (id, options) => {
    await apiFetch(`/payments/${id}/verify`, { method: "POST", body: options?.exceptionReason ? { exceptionReason: options.exceptionReason } : {} });
    return paymentView(id);
  },
  reject: async (id, reason) => {
    await apiFetch(`/payments/${id}/reject`, { method: "POST", body: { reason } });
    return paymentView(id);
  },
  returnForCorrection: async (id, reason) => {
    await apiFetch(`/payments/${id}/return`, { method: "POST", body: { reason } });
    return paymentView(id);
  },
  resubmit: async (id, input) => {
    // The corrected receipt keeps its stored reference; a new proof file replaces the old one.
    const { evidenceDataUrl, ...body } = input;
    await apiFetch(`/payments/${id}/resubmit`, { method: "POST", body });
    if (evidenceDataUrl) {
      try {
        await uploadEvidence(id, evidenceDataUrl, input.evidenceFileName);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "The upload failed.";
        throw new Error(`The receipt was corrected, but its new file could not be uploaded: ${reason}`);
      }
    }
    return paymentView(id);
  },
  adjust: async (id, input) => {
    await apiFetch(`/payments/${id}/adjust`, { method: "POST", body: input });
    return paymentView(id);
  },
  listUnmatched: async (options) => (await apiFetch<{ items: UnmatchedReceiptView[] }>("/unmatched-receipts", { signal: signalOf(options) })).items,
  submitUnmatched: async (input) => {
    if (input.evidenceDataUrl?.startsWith("data:")) throw new Error("Receipt files for unmatched receipts are not connected to the real backend yet. Record the receipt without a file, or match it to a contract first.");
    return (await apiFetch<{ receipt: UnmatchedReceiptView }>("/unmatched-receipts", {
      method: "POST",
      body: { amountCentavos: input.amountCentavos, method: input.method, paidDate: input.paidDate, orNumber: input.orNumber, reason: input.reason, evidenceFileName: input.evidenceFileName ?? undefined },
    })).receipt;
  },
  matchUnmatched: async (id, input) => {
    const { payment } = await apiFetch<{ payment: { id: string } }>(`/unmatched-receipts/${id}/match`, { method: "POST", body: input });
    return paymentView(payment.id);
  },
  rejectUnmatched: async (id, reason) => (await apiFetch<{ receipt: UnmatchedReceiptView }>(`/unmatched-receipts/${id}/reject`, { method: "POST", body: { reason } })).receipt,
});

const igp = (): Partial<IgpRepository> => ({
  list: async (options) => apiFetch<IgpRegister>("/igp", { signal: signalOf(options) }),
  act: async (action) => (await apiFetch<{ sale: IgpSale | null }>("/igp/actions", { method: "POST", body: action })).sale,
  importHistory: async (input) => (await apiFetch<{ batch: IgpHistoryBatch }>("/igp/history-import", { method: "POST", body: input })).batch,
});

const igpCatalog = (): Partial<IgpCatalogRepository> => ({
  list: async (options) => apiFetch<IgpCatalog>("/igp-catalog", { signal: signalOf(options) }),
  createProject: async (input) => (await apiFetch<{ project: IgpProjectView }>("/igp-catalog/projects", { method: "POST", body: input })).project,
  updateProject: async (id, input) => (await apiFetch<{ project: IgpProjectView }>(`/igp-catalog/projects/${encodeURIComponent(id)}`, { method: "POST", body: input })).project,
  deleteProject: async (id) => {
    await apiFetch(`/igp-catalog/projects/${encodeURIComponent(id)}/delete`, { method: "POST" });
  },
  createUnit: async (input) => (await apiFetch<{ unit: IgpUnitView }>("/igp-catalog/units", { method: "POST", body: input })).unit,
  updateUnit: async (id, input) => (await apiFetch<{ unit: IgpUnitView }>(`/igp-catalog/units/${encodeURIComponent(id)}`, { method: "POST", body: input })).unit,
  deleteUnit: async (id) => {
    await apiFetch(`/igp-catalog/units/${encodeURIComponent(id)}/delete`, { method: "POST" });
  },
});

const members = (): Partial<MemberRepository> => ({
  list: async (options) => (await apiFetch<{ items: OrgMember[] }>("/members", { signal: signalOf(options) })).items,
  getById: async (id, options) => (await fetchOrNull<{ member: OrgMember }>(`/members/${id}`, signalOf(options)))?.member ?? null,
  getByAaNumber: async (aaNumber, options) => (await apiFetch<{ member: OrgMember | null }>(`/members/resolve?number=${encodeURIComponent(aaNumber)}`, { signal: signalOf(options) })).member,
  listSeatVacancies: async (options) => (await apiFetch<{ items: SeatVacancy[] }>("/seat-vacancies", { signal: signalOf(options) })).items,
  recordSeatVacancy: async (seatMemberId, holderEndDate) => (await apiFetch<{ vacancy: SeatVacancy }>(`/members/${seatMemberId}/vacancy`, { method: "POST", body: { holderEndDate } })).vacancy,
  fillSeatVacancy: async (vacancyId, input) => (await apiFetch<{ vacancy: SeatVacancy }>(`/seat-vacancies/${vacancyId}/fill`, { method: "POST", body: input })).vacancy,
  listUplineSummaries: async (options) => (await apiFetch<{ items: UplineSummary[] }>("/members/uplines", { signal: signalOf(options) })).items,
  create: async (input) => (await apiFetch<{ member: OrgMember }>("/members", { method: "POST", body: input })).member,
  update: async (id, input) => (await apiFetch<{ member: OrgMember }>(`/members/${id}`, { method: "POST", body: input })).member,
  transfer: async (id, newParentId, options) =>
    (await apiFetch<{ member: OrgMember }>(`/members/${id}/transfer`, { method: "POST", body: { newParentId, designation: options?.designation, teamName: options?.teamName }, signal: signalOf(options) })).member,
  changeStatus: async (id, status) => (await apiFetch<{ member: OrgMember }>(`/members/${id}/status`, { method: "POST", body: { status } })).member,
  listEligibleParents: async (designation, options) => (await apiFetch<{ items: OrgMember[] }>(`/members/eligible-parents?designation=${designation}`, { signal: signalOf(options) })).items,
  getDirectDownline: async (id, options) => (await apiFetch<{ items: OrgMember[] }>(`/members/${id}/downline`, { signal: signalOf(options) })).items,
  getDescendants: async (id, options) => (await apiFetch<{ items: OrgMember[] }>(`/members/${id}/downline?scope=all`, { signal: signalOf(options) })).items,
  getParentHistory: async (id, options) => (await apiFetch<{ items: NonNullable<OrgMember["parentHistory"]> }>(`/members/${id}/history`, { signal: signalOf(options) })).items,
  lookupReferralCode: async (code, options) => (await apiFetch<{ items: OrgMember[] }>(`/members/referral-lookup?code=${encodeURIComponent(code)}`, { signal: signalOf(options) })).items,
  resolveReferralSponsor: async (code, options) => (await apiFetch<{ result: ReferralSponsorVerificationResult }>(`/public/referral?code=${encodeURIComponent(code)}`, { signal: signalOf(options) })).result,
  createAccreditedSeller: async (input) => apiFetch<AccreditedSellerResult>("/members/accredited-seller", { method: "POST", body: input }),
});

const accreditations = (): Partial<AccreditationRepository> => ({
  verifyPublic: async (aaNumber, options) => (await apiFetch<{ result: PublicAccreditationResult | null }>(`/public/accreditation?number=${encodeURIComponent(aaNumber)}`, { signal: signalOf(options) })).result,
  list: async (options) => (await apiFetch<{ items: AccreditationRecord[] }>("/accreditations", { signal: signalOf(options) })).items,
  getById: async (id, options) => (await fetchOrNull<{ accreditation: AccreditationRecord }>(`/accreditations/${id}`, signalOf(options)))?.accreditation ?? null,
  listByMember: async (memberId, options) => (await apiFetch<{ items: AccreditationRecord[] }>(`/members/${memberId}/accreditations`, { signal: signalOf(options) })).items,
  getCurrentForMember: async (memberId, options) => {
    const records = (await apiFetch<{ items: AccreditationRecord[] }>(`/members/${memberId}/accreditations`, { signal: signalOf(options) })).items;
    return getCurrentAccreditationRecord(records);
  },
  updateStatus: async (recordId, requested, options, expectedPrevious, reason) =>
    (await apiFetch<{ accreditation: AccreditationRecord }>(`/accreditations/${recordId}/status`, { method: "POST", body: { requested, expectedPrevious, reason }, signal: signalOf(options) })).accreditation,
  issuePendingAccreditation: async (memberId) => (await apiFetch<{ accreditation: AccreditationRecord }>("/accreditations/issue", { method: "POST", body: { memberId } })).accreditation,
  renew: async (recordId, input) => (await apiFetch<{ accreditation: AccreditationRecord }>(`/accreditations/${recordId}/renew`, { method: "POST", body: input ?? {} })).accreditation,
  resolveAaNumber: async (aaNumber, options) => (await apiFetch<{ resolution: AaNumberResolution | null }>(`/accreditations/resolve?number=${encodeURIComponent(aaNumber)}`, { signal: signalOf(options) })).resolution,
});

const registrations = (): Partial<RegistrationRepository> => ({
  list: async (options) => (await apiFetch<{ items: RegistrationApplication[] }>("/registrations", { signal: signalOf(options) })).items,
  getById: async (id, options) => (await fetchOrNull<{ application: RegistrationApplication }>(`/registrations/${id}`, signalOf(options)))?.application ?? null,
  submit: async (input, options) => apiFetch<{ reference: string }>("/public/registrations", { method: "POST", body: input, signal: signalOf(options) }),
  getForCorrection: async (token, options) => (await apiFetch<{ view: RegistrationCorrectionView | null }>(`/public/registrations/correction/${token}`, { signal: signalOf(options) })).view,
  resubmit: async (token, applicant, options) => apiFetch<{ reference: string }>(`/public/registrations/correction/${token}`, { method: "POST", body: { applicant }, signal: signalOf(options) }),
  complete: async (id, completion) => (await apiFetch<{ application: RegistrationApplication }>(`/registrations/${id}/complete`, { method: "POST", body: completion })).application,
  approve: async (id, input) => (await apiFetch<{ application: RegistrationApplication }>(`/registrations/${id}/approve`, { method: "POST", body: input })).application,
  returnForCorrection: async (id, reason) => (await apiFetch<{ application: RegistrationApplication }>(`/registrations/${id}/return`, { method: "POST", body: { reason } })).application,
  reject: async (id, reason) => (await apiFetch<{ application: RegistrationApplication }>(`/registrations/${id}/reject`, { method: "POST", body: { reason } })).application,
});

const products = (): Partial<ProductRepository> => ({
  list: async (options) => (await apiFetch<{ items: VipProduct[] }>("/products", { signal: signalOf(options) })).items,
  listSchemes: async (options) => (await apiFetch<{ items: PaymentScheme[] }>("/payment-schemes", { signal: signalOf(options) })).items,
  create: async (input, reason) => (await apiFetch<{ product: VipProduct }>("/products", { method: "POST", body: { input, reason } })).product,
  update: async (code, input, reason) => (await apiFetch<{ product: VipProduct }>(`/products/${encodeURIComponent(code)}`, { method: "POST", body: { input, reason } })).product,
  approve: async (code, reason) => (await apiFetch<{ product: VipProduct }>(`/products/${encodeURIComponent(code)}/approve`, { method: "POST", body: { reason } })).product,
  delete: async (code, reason) => {
    await apiFetch(`/products/${encodeURIComponent(code)}/delete`, { method: "POST", body: { reason } });
  },
  deleteBlockers: async (options) => (await apiFetch<{ blockers: Record<string, string | null> }>("/products/delete-blockers", { signal: signalOf(options) })).blockers,
  createScheme: async (input) => (await apiFetch<{ scheme: PaymentScheme }>("/payment-schemes", { method: "POST", body: input })).scheme,
  updateScheme: async (id, input, reason) => (await apiFetch<{ scheme: PaymentScheme }>(`/payment-schemes/${encodeURIComponent(id)}`, { method: "POST", body: { input, reason } })).scheme,
});

const tierLevels = (): Partial<TierLevelRepository> => ({
  list: async (options) => (await apiFetch<{ items: TierLevelView[] }>("/tier-levels", { signal: signalOf(options) })).items,
  create: async (input) => (await apiFetch<{ level: TierLevelView }>("/tier-levels", { method: "POST", body: input })).level,
  update: async (id, input) => (await apiFetch<{ level: TierLevelView }>(`/tier-levels/${encodeURIComponent(id)}`, { method: "POST", body: input })).level,
  deactivate: async (id) => (await apiFetch<{ level: TierLevelView }>(`/tier-levels/${encodeURIComponent(id)}/deactivate`, { method: "POST" })).level,
  delete: async (id) => {
    await apiFetch(`/tier-levels/${encodeURIComponent(id)}/delete`, { method: "POST" });
  },
});

const experiences = (): Partial<ExperienceRepository> => {
  const list = async (options?: MockAsyncOptions) => (await apiFetch<{ items: Experience[] }>("/experiences", { signal: signalOf(options) })).items;
  return {
    list,
    listPublic: async (options) => (await list(options)).filter((item) => item.published),
  };
};

// shortcut: usage tracking (inUse) arrives with the modules that own the references (F3/F7).
const referenceLists = (): Partial<ReferenceListRepository> => ({
  list: async (options) =>
    (await apiFetch<{ items: ReferenceEntry[] }>("/reference-lists", { signal: signalOf(options) })).items.map((item) => ({ ...item, inUse: false }) as ReferenceEntryView),
});

const outlets = (): Partial<OutletRepository> => ({
  list: async (options) =>
    (await apiFetch<{ items: Outlet[] }>("/outlets", { signal: signalOf(options) })).items.map((item) => ({ ...item, inUse: false }) as OutletView),
});

const departments = (): Partial<DepartmentRepository> => ({
  list: async (options) => (await apiFetch<{ items: Department[] }>("/departments", { signal: signalOf(options) })).items,
  getById: async (id, options) => (await fetchOrNull<{ department: Department }>(`/departments/${id}`, signalOf(options)))?.department ?? null,
  create: async (input) => (await apiFetch<{ department: Department }>("/departments", { method: "POST", body: input })).department,
  update: async (id, input) => (await apiFetch<{ department: Department }>(`/departments/${id}`, { method: "POST", body: input })).department,
  delete: async (id) => {
    await apiFetch(`/departments/${id}/delete`, { method: "POST" });
  },
});

const roles = (): Partial<DepartmentRoleRepository> => ({
  list: async (options) => (await apiFetch<{ items: DepartmentRole[] }>("/roles", { signal: signalOf(options) })).items,
  listForAssignment: async (options) => (await apiFetch<{ items: DepartmentRoleOption[] }>("/roles/options", { signal: signalOf(options) })).items,
  getById: async (id, options) => (await fetchOrNull<{ role: DepartmentRole }>(`/roles/${id}`, signalOf(options)))?.role ?? null,
  create: async (input) => (await apiFetch<{ role: DepartmentRole }>("/roles", { method: "POST", body: input })).role,
  update: async (id, input) => (await apiFetch<{ role: DepartmentRole }>(`/roles/${id}`, { method: "POST", body: input })).role,
  delete: async (id) => {
    await apiFetch(`/roles/${id}/delete`, { method: "POST" });
  },
});

const staff = (): Partial<StaffRepository> => ({
  list: async (options) => (await apiFetch<{ items: StaffMember[] }>("/staff", { signal: signalOf(options) })).items,
  getById: async (id, options) => (await fetchOrNull<{ staff: StaffMember }>(`/staff/${id}`, signalOf(options)))?.staff ?? null,
  getSelf: async (options) => (await apiFetch<{ profile: Awaited<ReturnType<StaffRepository["getSelf"]>> }>("/staff/self", { signal: signalOf(options) })).profile,
  listPolicies: async (options) => (await apiFetch<{ policies: Awaited<ReturnType<StaffRepository["listPolicies"]>> }>("/staff/policies", { signal: signalOf(options) })).policies,
  create: async (input) => (await apiFetch<{ staff: StaffMember }>("/staff", { method: "POST", body: input })).staff,
  update: async (id, input) => (await apiFetch<{ staff: StaffMember }>(`/staff/${id}`, { method: "POST", body: input })).staff,
  updateLinkedAccountStatus: async (staffId, status: AccountStatus, options) =>
    (await apiFetch<{ linkedAccount: Awaited<ReturnType<StaffRepository["updateLinkedAccountStatus"]>> }>(`/staff/${staffId}/status`, { method: "POST", body: { status }, signal: signalOf(options) })).linkedAccount,
  delete: async (id) => {
    await apiFetch(`/staff/${id}/delete`, { method: "POST" });
  },
});

const accounts = (): Partial<AccountRepository> => ({
  list: async (options) => (await apiFetch<{ items: Account[] }>("/accounts", { signal: signalOf(options) })).items,
  getPolicies: async (options) => (await apiFetch<{ policies: AccountPolicies }>("/accounts/policies", { signal: signalOf(options) })).policies,
  getById: async (id, options) => (await fetchOrNull<{ account: Account }>(`/accounts/${id}`, signalOf(options)))?.account ?? null,
  create: async (input) => (await apiFetch<{ account: Account }>("/accounts", { method: "POST", body: input })).account,
  update: async (id, input) => (await apiFetch<{ account: Account }>(`/accounts/${id}`, { method: "POST", body: input })).account,
  assignRole: async (id, role, options) => (await apiFetch<{ account: Account }>(`/accounts/${id}/roles`, { method: "POST", body: { role }, signal: signalOf(options) })).account,
  revokeRole: async (id, role, options) => (await apiFetch<{ account: Account }>(`/accounts/${id}/roles/revoke`, { method: "POST", body: { role }, signal: signalOf(options) })).account,
  updateStatus: async (id, status, options) => (await apiFetch<{ account: Account }>(`/accounts/${id}/status`, { method: "POST", body: { status }, signal: signalOf(options) })).account,
  requestPasswordReset: async (id, options) => {
    const result = await apiFetch<{ email: string; resetLink?: string }>(`/accounts/${id}/password-reset`, { method: "POST", signal: signalOf(options) });
    // Local Auth emulator has no mail delivery, so the generated link is shown instead of sent.
    if (result.resetLink) return { message: `Password reset requested for ${result.email}. Local emulator link: ${result.resetLink}` };
    const { getClientAuth } = await import("@/shared/lib/firebase-client");
    const { sendPasswordResetEmail } = await import("firebase/auth");
    await sendPasswordResetEmail(getClientAuth(), result.email);
    return { message: `Password reset email sent to ${result.email}.` };
  },
});

const reports = (): Partial<ReportRepository> => ({
  recordExport: async (input) => {
    await apiFetch("/reports/export", { method: "POST", body: input });
  },
});

// F6: the commissions module reads and writes through the /api/v1/commissions routes.
const commissions = (): Partial<CommissionRepository> => ({
  list: (options) => (async () => {
    const page = await apiFetch<{ items: CommissionView[] }>("/commissions", { signal: signalOf(options) });
    return page.items;
  })(),
  rateDirectory: (options) => apiFetch<CommissionRateDirectory>("/commissions/rates", { signal: signalOf(options) }),
  setRate: async (input) => {
    await apiFetch("/commissions/rates", { method: "POST", body: input });
  },
  setPositionRate: async (input) => {
    await apiFetch("/commissions/position-rates", { method: "POST", body: input });
  },
  applyPositionRate: async (input) => {
    await apiFetch("/commissions/position-rates/apply", { method: "POST", body: input });
  },
  payoutLists: (options) => (async () => {
    const page = await apiFetch<{ items: CommissionPayoutList[] }>("/commissions/payout-lists", { signal: signalOf(options) });
    return page.items;
  })(),
  preparePayoutList: async (month) => (await apiFetch<{ list: CommissionPayoutList }>("/commissions/payout-lists", { method: "POST", body: { month } })).list,
  approvePayoutList: async (id) => (await apiFetch<{ list: CommissionPayoutList }>(`/commissions/payout-lists/${id}/approve`, { method: "POST" })).list,
  clawbacks: (options) => (async () => {
    const page = await apiFetch<{ items: CommissionClawback[] }>("/commissions/clawbacks", { signal: signalOf(options) });
    return page.items;
  })(),
  setClawbackAddendum: async (memberId, signedDate) => {
    await apiFetch("/commissions/addendum", { method: "POST", body: { memberId, signedDate } });
  },
  recordRecovery: async (id, input) => {
    await apiFetch(`/commissions/clawbacks/${id}/recovery`, { method: "POST", body: input });
  },
  writeOff: async (id, reason) => {
    await apiFetch(`/commissions/clawbacks/${id}/write-off`, { method: "POST", body: { reason } });
  },
  allowanceReviews: (options) => apiFetch<Awaited<ReturnType<CommissionRepository["allowanceReviews"]>>>("/commissions/allowances", { signal: signalOf(options) }),
  assembleAllowanceInputs: (month, options) => apiFetch<Awaited<ReturnType<CommissionRepository["assembleAllowanceInputs"]>>>(`/commissions/allowances/assemble?month=${encodeURIComponent(month)}`, { signal: signalOf(options) }),
  saveAllowanceReview: async (input) => (await apiFetch<{ review: Awaited<ReturnType<CommissionRepository["saveAllowanceReview"]>> }>("/commissions/allowances", { method: "POST", body: input })).review,
  adjust: async (id, percentBp, reason) => (await apiFetch<{ commission: CommissionView }>(`/commissions/${id}/adjust`, { method: "POST", body: { percentBp, reason } })).commission,
  resolveHold: async (id, action, reason) => (await apiFetch<{ commission: CommissionView }>(`/commissions/${id}/resolve-hold`, { method: "POST", body: { action, reason } })).commission,
  cancel: async (id, reason) => (await apiFetch<{ commission: CommissionView }>(`/commissions/${id}/cancel`, { method: "POST", body: { reason } })).commission,
  recordPayout: async (id, input) => (await apiFetch<{ commission: CommissionView }>(`/commissions/${id}/payout`, { method: "POST", body: input })).commission,
  confirmPayout: async (id) => (await apiFetch<{ commission: CommissionView }>(`/commissions/${id}/confirm`, { method: "POST" })).commission,
  voidPayout: async (id, reason) => (await apiFetch<{ commission: CommissionView }>(`/commissions/${id}/void`, { method: "POST", body: { reason } })).commission,
});

// F7: memberships, cards and Stay Points read and write through the API.
const memberships = (): Partial<MembershipRepository> => ({
  list: async (options) => (await apiFetch<{ items: MembershipView[] }>("/memberships", { signal: signalOf(options) })).items,
  lookupActiveVip: async (term, options) => (await apiFetch<{ items: CustomerLookupResult[] }>(`/memberships/lookup?term=${encodeURIComponent(term)}`, { signal: signalOf(options) })).items,
  activate: async (id) => (await apiFetch<{ membership: MembershipView }>(`/memberships/${id}/activate`, { method: "POST" })).membership,
  recordCardClaim: async (id) => (await apiFetch<{ membership: MembershipView }>(`/memberships/${id}/claim`, { method: "POST" })).membership,
  serviceCard: async (id, input) => (await apiFetch<{ membership: MembershipView }>(`/memberships/${id}/service`, { method: "POST", body: input })).membership,
});

const stayPoints = (): Partial<StayPointsRepository> => ({
  list: async (options) => (await apiFetch<{ items: MembershipPoints[] }>("/stay-points", { signal: signalOf(options) })).items,
  venues: async (options) => (await apiFetch<{ items: StayPointsOverview["venues"] }>("/stay-points/venues", { signal: signalOf(options) })).items,
  act: (action, options) => apiFetch<MembershipPoints>("/stay-points/act", { method: "POST", body: action, signal: signalOf(options) }),
});

const NOT_IN_PILOT = [
  "audit", "memberQr", "redemption",
  "reservations", "promos", "reconciliation",
] as const;

/** The repositories the real local backend serves (organization/access, sales network, accreditation, registration, customers, contracts, sales, receipts, members, catalog and export audit); the rest report "not connected yet". */
export function createHttpRepositories(): Repositories {
  const rest = Object.fromEntries(NOT_IN_PILOT.map((name) => [name, partial(name, {})]));
  return {
    ...rest,
    customers: partial("customers", customers()),
    contracts: partial("contracts", contracts()),
    sales: partial("sales", sales()),
    payments: partial("payments", payments()),
    members: partial("members", members()),
    accreditations: partial("accreditations", accreditations()),
    registrations: partial("registrations", registrations()),
    products: partial("products", products()),
    tierLevels: partial("tierLevels", tierLevels()),
    igp: partial("igp", igp()),
    igpCatalog: partial("igpCatalog", igpCatalog()),
    historyImports: partial("historyImports", historyImports()),
    reports: partial("reports", reports()),
    commissions: partial("commissions", commissions()),
    memberships: partial("memberships", memberships()),
    stayPoints: partial("stayPoints", stayPoints()),
    experiences: partial("experiences", experiences()),
    referenceLists: partial("referenceLists", referenceLists()),
    outlets: partial("outlets", outlets()),
    departments: partial("departments", departments()),
    roles: partial("roles", roles()),
    staff: partial("staff", staff()),
    accounts: partial("accounts", accounts()),
  } as unknown as Repositories;
}

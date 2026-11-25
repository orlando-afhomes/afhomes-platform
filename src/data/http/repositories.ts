import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { AccountRepository } from "@/data/contracts/account-repository";
import { CustomerValidationError, type CustomerPage, type CustomerRepository } from "@/data/contracts/customer-repository";
import type { ContractRepository, ContractView } from "@/data/contracts/contract-repository";
import type { DepartmentRepository } from "@/data/contracts/department-repository";
import type { ExperienceRepository } from "@/data/contracts/experience-repository";
import type { MemberRepository } from "@/data/contracts/member-repository";
import type { OutletRepository, OutletView } from "@/data/contracts/outlet-repository";
import type { PaymentRepository, PaymentView, SubmitPaymentInput } from "@/data/contracts/payment-repository";
import type { ReferenceEntryView, ReferenceListRepository } from "@/data/contracts/reference-list-repository";
import type { ProductRepository } from "@/data/contracts/product-repository";
import type { ReportRepository } from "@/data/contracts/report-repository";
import type { Repositories } from "@/data/contracts/repositories";
import type { DepartmentRoleRepository } from "@/data/contracts/role-repository";
import type { SaleRepository, SaleView } from "@/data/contracts/sale-repository";
import type { StaffRepository } from "@/data/contracts/staff-repository";
import type { Account, AccountPolicies, AccountStatus } from "@/modules/accounts/types";
import type { Customer, CustomerDraftInput } from "@/modules/customers/types";
import type { Experience } from "@/modules/experiences/types";
import type { Department, DepartmentRole, DepartmentRoleOption, OrgMember, StaffMember } from "@/modules/organization/types";
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

// shortcut: the first screens upload a government ID image as a data URL. Files move to private storage with the customers module.
function withoutUnsupportedFiles(input: CustomerDraftInput): CustomerDraftInput {
  if (input.governmentIdImage) throw new Error("Uploading a government ID image is not connected to the real backend yet. Remove the image to continue.");
  const { governmentIdImage: _image, ...rest } = input;
  void _image;
  return rest as CustomerDraftInput;
}

const customers = (): Partial<CustomerRepository> => ({
  list: (options) => fetchAllPages<Customer>("/customers", 100, signalOf(options)),
  listPage: (query, options) => apiFetch<CustomerPage>(`/customers?limit=${query.limit}${query.afterId ? `&after=${query.afterId}` : ""}`, { signal: signalOf(options) }),
  getById: async (id, options) => (await fetchOrNull<{ customer: Customer }>(`/customers/${id}`, signalOf(options)))?.customer ?? null,
  createDraft: (input) => withFieldErrors(async () => (await apiFetch<{ customer: Customer }>("/customers", { method: "POST", body: withoutUnsupportedFiles(input) })).customer),
  submit: (id, input) => withFieldErrors(async () => (await apiFetch<{ customer: Customer }>(`/customers/${id}/submit`, { method: "POST", body: withoutUnsupportedFiles(input) })).customer),
  approve: async (id) => (await apiFetch<{ customer: Customer }>(`/customers/${id}/approve`, { method: "POST" })).customer,
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
});

const sales = (): Partial<SaleRepository> => ({
  list: (options) => fetchAllPages<SaleView>("/sales", 500, signalOf(options)),
  getById: async (id, options) => (await fetchOrNull<{ sale: SaleView }>(`/sales/${id}`, signalOf(options)))?.sale ?? null,
  approve: async (id) => {
    await apiFetch(`/sales/${id}/approve`, { method: "POST" });
    return saleView(id);
  },
  // Month close is not part of the pilot, so no month has been closed.
  listClosedMonths: async () => [],
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
  // Receipts without a matching contract are not part of the pilot, so none are waiting.
  listUnmatched: async () => [],
});

const members = (): Partial<MemberRepository> => ({
  list: async (options) => (await apiFetch<{ items: OrgMember[] }>("/members", { signal: signalOf(options) })).items,
  getById: async (id, options) => (await apiFetch<{ items: OrgMember[] }>("/members", { signal: signalOf(options) })).items.find((member) => member.id === id) ?? null,
});

const products = (): Partial<ProductRepository> => ({
  list: async (options) => (await apiFetch<{ items: VipProduct[] }>("/products", { signal: signalOf(options) })).items,
  listSchemes: async (options) => (await apiFetch<{ items: PaymentScheme[] }>("/payment-schemes", { signal: signalOf(options) })).items,
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

const NOT_IN_PILOT = [
  "accreditations", "registrations", "audit", "memberQr", "memberships", "commissions", "stayPoints", "redemption",
  "reservations", "tierLevels", "promos", "reconciliation", "historyImports", "igp", "igpCatalog",
] as const;

/** The repositories the real local backend serves (organization/access, customer, contract, sale, receipt, members, catalog and export audit); the rest report "not connected yet". */
export function createHttpRepositories(): Repositories {
  const rest = Object.fromEntries(NOT_IN_PILOT.map((name) => [name, partial(name, {})]));
  return {
    ...rest,
    customers: partial("customers", customers()),
    contracts: partial("contracts", contracts()),
    sales: partial("sales", sales()),
    payments: partial("payments", payments()),
    members: partial("members", members()),
    products: partial("products", products()),
    reports: partial("reports", reports()),
    experiences: partial("experiences", experiences()),
    referenceLists: partial("referenceLists", referenceLists()),
    outlets: partial("outlets", outlets()),
    departments: partial("departments", departments()),
    roles: partial("roles", roles()),
    staff: partial("staff", staff()),
    accounts: partial("accounts", accounts()),
  } as unknown as Repositories;
}

import type { CustomerRepository } from "@/data/contracts/customer-repository";
import type { MemberRepository } from "@/data/contracts/member-repository";
import type { ProductRepository } from "@/data/contracts/product-repository";
import type { AccountRepository } from "@/data/contracts/account-repository";
import type { DepartmentRepository } from "@/data/contracts/department-repository";
import type { DepartmentRoleRepository } from "@/data/contracts/role-repository";
import type { StaffRepository } from "@/data/contracts/staff-repository";
import type { ContractRepository } from "@/data/contracts/contract-repository";
import type { SaleRepository } from "@/data/contracts/sale-repository";
import type { PaymentRepository } from "@/data/contracts/payment-repository";
import type { MembershipRepository } from "@/data/contracts/membership-repository";
import type { CommissionRepository } from "@/data/contracts/commission-repository";
import type { StayPointsRepository } from "@/data/contracts/stay-points-repository";
import type { RedemptionRepository } from "@/data/contracts/redemption-repository";
import type { ReconciliationRepository } from "@/data/contracts/reconciliation-repository";
import type { HistoryImportRepository } from "@/data/contracts/history-import-repository";
import { MockReconciliationRepository } from "./reconciliation-repository";
import { MockHistoryImportRepository } from "./history-import-repository";
import { MockContractRepository } from "./contract-repository";
import { MockSaleRepository } from "./sale-repository";
import { MockPaymentRepository } from "./payment-repository";
import { MockMembershipRepository } from "./membership-repository";
import { MockCommissionRepository } from "./commission-repository";
import { MockStayPointsRepository } from "./stay-points-repository";
import { MockRedemptionRepository } from "./redemption-repository";
import type { AuditRepository } from "@/data/contracts/audit-repository";
import { MockAuditRepository } from "./audit-repository";
import type { DevIdentity } from "@/modules/identity/types";
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { AccreditationRepository } from "@/data/contracts/accreditation-repository";
import type { RegistrationRepository } from "@/data/contracts/registration-repository";
import { MockAccreditationRepository } from "./accreditation-repository";
import { MockRegistrationRepository } from "./registration-repository";
import { MockCustomerRepository } from "./customer-repository";
import { MockMemberRepository } from "./member-repository";
import { MockProductRepository } from "./product-repository";
import { MockAccountRepository } from "./account-repository";
import { MockDepartmentRepository } from "./department-repository";
import { MockDepartmentRoleRepository } from "./role-repository";
import { MockStaffRepository } from "./staff-repository";
import type { MockStore } from "./seed";

export type MockRepositories = {
  members: MemberRepository;
  customers: CustomerRepository;
  products: ProductRepository;
  accounts: AccountRepository;
  departments: DepartmentRepository;
  roles: DepartmentRoleRepository;
  staff: StaffRepository;
  accreditations: AccreditationRepository;
  registrations: RegistrationRepository;
  audit: AuditRepository;
  contracts: ContractRepository;
  sales: SaleRepository;
  payments: PaymentRepository;
  memberships: MembershipRepository;
  commissions: CommissionRepository;
  stayPoints: StayPointsRepository;
  redemption: RedemptionRepository;
  reconciliation: ReconciliationRepository;
  historyImports: HistoryImportRepository;
};

export function createMockRepositories(
  store: MockStore,
  getIdentity: () => DevIdentity,
  asyncOptions?: MockAsyncOptions,
): MockRepositories {
  return {
    members: new MockMemberRepository(store, getIdentity, asyncOptions),
    customers: new MockCustomerRepository(store, getIdentity, asyncOptions),
    products: new MockProductRepository(store, getIdentity, asyncOptions),
    accounts: new MockAccountRepository(store, getIdentity, asyncOptions),
    departments: new MockDepartmentRepository(store, getIdentity, asyncOptions),
    roles: new MockDepartmentRoleRepository(store, getIdentity, asyncOptions),
    staff: new MockStaffRepository(store, getIdentity, asyncOptions),
    accreditations: new MockAccreditationRepository(store, getIdentity, asyncOptions),
    registrations: new MockRegistrationRepository(store, getIdentity, asyncOptions),
    audit: new MockAuditRepository(store, getIdentity, asyncOptions),
    contracts: new MockContractRepository(store, getIdentity, asyncOptions),
    sales: new MockSaleRepository(store, getIdentity, asyncOptions),
    payments: new MockPaymentRepository(store, getIdentity, asyncOptions),
    memberships: new MockMembershipRepository(store, getIdentity, asyncOptions),
    commissions: new MockCommissionRepository(store, getIdentity, asyncOptions),
    stayPoints: new MockStayPointsRepository(store, getIdentity, asyncOptions),
    redemption: new MockRedemptionRepository(store, getIdentity, asyncOptions),
    reconciliation: new MockReconciliationRepository(store, getIdentity, asyncOptions),
    historyImports: new MockHistoryImportRepository(store, getIdentity, asyncOptions),
  };
}

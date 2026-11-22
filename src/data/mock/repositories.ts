import { resolveMockIdentity } from "./authorization";
import type { Repositories } from "@/data/contracts/repositories";
import { MockMemberQrRepository } from "./member-qr-repository";
import { MockReportRepository } from "./report-repository";
import { MockReferenceListRepository } from "./reference-list-repository";
import { MockTierLevelRepository } from "./tier-level-repository";
import { MockOutletRepository } from "./outlet-repository";
import { MockPromoRepository } from "./promo-repository";
import { MockExperienceRepository } from "./experience-repository";
import { MockReconciliationRepository } from "./reconciliation-repository";
import { MockHistoryImportRepository } from "./history-import-repository";
import { MockIgpRepository } from "./igp-repository";
import { MockIgpCatalogRepository } from "./igp-catalog-repository";
import { MockContractRepository } from "./contract-repository";
import { MockSaleRepository } from "./sale-repository";
import { MockPaymentRepository } from "./payment-repository";
import { MockMembershipRepository } from "./membership-repository";
import { MockCommissionRepository } from "./commission-repository";
import { MockStayPointsRepository } from "./stay-points-repository";
import { MockRedemptionRepository } from "./redemption-repository";
import { MockAuditRepository } from "./audit-repository";
import type { DevIdentity } from "@/modules/identity/types";
import type { MockAsyncOptions } from "@/data/contracts/async-options";
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

export type MockRepositories = Repositories;

export function createMockRepositories(
  store: MockStore,
  getIdentity: () => DevIdentity,
  asyncOptions?: MockAsyncOptions,
): MockRepositories {
  const effectiveIdentity = () => resolveMockIdentity(store, getIdentity());
  return {
    members: new MockMemberRepository(store, effectiveIdentity, asyncOptions),
    customers: new MockCustomerRepository(store, effectiveIdentity, asyncOptions),
    products: new MockProductRepository(store, effectiveIdentity, asyncOptions),
    accounts: new MockAccountRepository(store, effectiveIdentity, asyncOptions),
    departments: new MockDepartmentRepository(store, effectiveIdentity, asyncOptions),
    roles: new MockDepartmentRoleRepository(store, effectiveIdentity, asyncOptions),
    staff: new MockStaffRepository(store, effectiveIdentity, asyncOptions),
    accreditations: new MockAccreditationRepository(store, effectiveIdentity, asyncOptions),
    registrations: new MockRegistrationRepository(store, effectiveIdentity, asyncOptions),
    audit: new MockAuditRepository(store, effectiveIdentity, asyncOptions),
    contracts: new MockContractRepository(store, effectiveIdentity, asyncOptions),
    sales: new MockSaleRepository(store, effectiveIdentity, asyncOptions),
    payments: new MockPaymentRepository(store, effectiveIdentity, asyncOptions),
    memberQr: new MockMemberQrRepository(store, effectiveIdentity, asyncOptions),
    memberships: new MockMembershipRepository(store, effectiveIdentity, asyncOptions),
    commissions: new MockCommissionRepository(store, effectiveIdentity, asyncOptions),
    stayPoints: new MockStayPointsRepository(store, effectiveIdentity, asyncOptions),
    redemption: new MockRedemptionRepository(store, effectiveIdentity, asyncOptions),
    referenceLists: new MockReferenceListRepository(store, effectiveIdentity, asyncOptions),
    tierLevels: new MockTierLevelRepository(store, effectiveIdentity, asyncOptions),
    outlets: new MockOutletRepository(store, effectiveIdentity, asyncOptions),
    promos: new MockPromoRepository(store, effectiveIdentity, asyncOptions),
    experiences: new MockExperienceRepository(store, effectiveIdentity, asyncOptions),
    reconciliation: new MockReconciliationRepository(store, effectiveIdentity, asyncOptions),
    historyImports: new MockHistoryImportRepository(store, effectiveIdentity, asyncOptions),
    igp: new MockIgpRepository(store, effectiveIdentity, asyncOptions),
    igpCatalog: new MockIgpCatalogRepository(store, effectiveIdentity, asyncOptions),
    reports: new MockReportRepository(store, effectiveIdentity, asyncOptions),
  };
}

import type { CustomerRepository } from "@/data/contracts/customer-repository";
import type { MemberRepository } from "@/data/contracts/member-repository";
import type { ProductRepository } from "@/data/contracts/product-repository";
import type { AccountRepository } from "@/data/contracts/account-repository";
import type { DepartmentRepository } from "@/data/contracts/department-repository";
import type { DepartmentRoleRepository } from "@/data/contracts/role-repository";
import type { StaffRepository } from "@/data/contracts/staff-repository";
import type { DevIdentity } from "@/modules/identity/types";
import type { MockAsyncOptions } from "@/data/contracts/async-options";
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
};

export function createMockRepositories(
  store: MockStore,
  getIdentity: () => DevIdentity,
  asyncOptions?: MockAsyncOptions,
): MockRepositories {
  return {
    members: new MockMemberRepository(store, getIdentity, asyncOptions),
    customers: new MockCustomerRepository(store, getIdentity, asyncOptions),
    products: new MockProductRepository(store, asyncOptions),
    accounts: new MockAccountRepository(store, getIdentity, asyncOptions),
    departments: new MockDepartmentRepository(store, getIdentity, asyncOptions),
    roles: new MockDepartmentRoleRepository(store, getIdentity, asyncOptions),
    staff: new MockStaffRepository(store, getIdentity, asyncOptions),
  };
}

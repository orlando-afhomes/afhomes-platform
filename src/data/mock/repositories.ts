import type { CustomerRepository } from "@/data/contracts/customer-repository";
import type { MemberRepository } from "@/data/contracts/member-repository";
import type { ProductRepository } from "@/data/contracts/product-repository";
import type { DevIdentity } from "@/modules/identity/types";
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import { MockCustomerRepository } from "./customer-repository";
import { MockMemberRepository } from "./member-repository";
import { MockProductRepository } from "./product-repository";
import type { MockStore } from "./seed";

export type MockRepositories = {
  members: MemberRepository;
  customers: CustomerRepository;
  products: ProductRepository;
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
  };
}

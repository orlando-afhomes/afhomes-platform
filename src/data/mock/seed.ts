import type { Customer } from "@/modules/customers/types";
import type { OrgMember } from "@/modules/organization/types";
import type { VipProduct } from "@/modules/vip/types";

export type MockStore = {
  members: OrgMember[];
  customers: Customer[];
  products: VipProduct[];
  customerSequence: number;
};

const members: OrgMember[] = [
  { id: "mem-svd-a", displayName: "SVD Alpha", designation: "SVD", branchId: "branch-a", parentId: null, status: "active" },
  { id: "mem-ssm-a", displayName: "SSM Alpha", designation: "SSM", branchId: "branch-a", parentId: "mem-svd-a", status: "active" },
  { id: "mem-sm-a", displayName: "SM Alpha", designation: "SM", branchId: "branch-a", parentId: "mem-ssm-a", status: "active" },
  { id: "mem-ost-a1", displayName: "OST Alpha One", designation: "OST", branchId: "branch-a", parentId: "mem-sm-a", status: "active" },
  { id: "mem-ost-a2", displayName: "OST Alpha Two", designation: "OST", branchId: "branch-a", parentId: "mem-svd-a", status: "active" },
  { id: "mem-ist-a", displayName: "IST Alpha", designation: "IST", branchId: "branch-a", parentId: null, status: "active" },
  { id: "mem-svd-b", displayName: "SVD Beta", designation: "SVD", branchId: "branch-b", parentId: null, status: "active" },
  { id: "mem-ost-b1", displayName: "OST Beta One", designation: "OST", branchId: "branch-b", parentId: "mem-svd-b", status: "active" },
];

const customers: Customer[] = [
  { id: "cust-a1", displayName: "Customer A One", branchId: "branch-a", ownerMemberId: "mem-ost-a1", status: "submitted" },
  { id: "cust-a2", displayName: "Customer A Two", branchId: "branch-a", ownerMemberId: "mem-sm-a", status: "draft" },
  { id: "cust-b1", displayName: "Customer B One", branchId: "branch-b", ownerMemberId: "mem-ost-b1", status: "submitted" },
];

const products: VipProduct[] = [
  { code: "B1", name: "Bronze VIP", tier: "Bronze" },
  { code: "S1", name: "Silver VIP", tier: "Silver" },
  { code: "G1", name: "Gold VIP", tier: "Gold" },
];

export function createSeedStore(): MockStore {
  return {
    members: members.map((item) => ({ ...item })),
    customers: customers.map((item) => ({ ...item })),
    products: products.map((item) => ({ ...item })),
    customerSequence: customers.length + 1,
  };
}

export function createMockStore(seed: MockStore = createSeedStore()): MockStore {
  return {
    members: seed.members.map((item) => ({ ...item })),
    customers: seed.customers.map((item) => ({ ...item })),
    products: seed.products.map((item) => ({ ...item })),
    customerSequence: seed.customerSequence,
  };
}

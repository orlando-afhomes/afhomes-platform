import type { Customer } from "@/modules/customers/types";
import type { OrgMember, Department, DepartmentRole, StaffMember } from "@/modules/organization/types";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import type { VipProduct, PaymentScheme } from "@/modules/vip/types";
import type { Account } from "@/modules/accounts/types";
import type { Contract } from "@/modules/contracts/types";
import type { Sale } from "@/modules/sales/types";
import type { Payment } from "@/modules/finance/types";
import type { Membership } from "@/modules/membership/types";
import type { Commission } from "@/modules/commissions/types";
import type { ResortSpend } from "@/modules/stay-points/types";

/** Types of the centralized synthetic seed (see afhomes-seed.js). */
export declare const seedData: {
  members: OrgMember[];
  accreditations: AccreditationRecord[];
  customers: Customer[];
  products: VipProduct[];
  paymentSchemes: PaymentScheme[];
  contracts: Contract[];
  sales: Sale[];
  payments: Payment[];
  memberships: Membership[];
  commissions: Commission[];
  resortSpends: ResortSpend[];
  accounts: Account[];
  departments: Department[];
  roles: DepartmentRole[];
  staff: StaffMember[];
  counters: Record<string, number>;
};

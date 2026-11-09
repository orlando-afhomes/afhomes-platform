import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { StaffActionPolicy, StaffMember, StaffStatus } from "@/modules/organization/types";
import type { AccountStatus, LinkedAccountSummary } from "@/modules/accounts/types";

export type StaffProfileInput = {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  suffix?: string | null;
  mobileNumber?: string | null;
  street?: string | null;
  province?: string | null;
  city?: string | null;
  barangay?: string | null;
  subdivision?: string | null;
  postalCode?: string | null;
  telephone?: string | null;
  facebook?: string | null;
  tin?: string | null;
  gender?: string | null;
  civilStatus?: string | null;
  governmentIdType?: string | null;
  governmentIdNumber?: string | null;
};

export type StaffSelfProfile = { staff: StaffMember; linkedAccount: LinkedAccountSummary | null };

export interface StaffRepository {
  list(options?: MockAsyncOptions): Promise<StaffMember[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<StaffMember | null>;
  /** The acting identity's own staff record and linked-account summary. */
  getSelf(options?: MockAsyncOptions): Promise<StaffSelfProfile | null>;
  listPolicies(options?: MockAsyncOptions): Promise<Record<string, StaffActionPolicy>>;
  /**
   * `provisionPendingAccount` atomically creates and links a Pending account (doc 01 §5, §6.2).
   * `systemRoleIds` grants system roles on that account; Accounts-module holders only.
   */
  create(input: { displayName: string; position: string; departmentId?: string | null; departmentRoleId?: string | null; email: string; avatarUrl?: string | null; accountId?: string | null; provisionPendingAccount?: boolean; systemRoleIds?: string[] } & StaffProfileInput, options?: MockAsyncOptions): Promise<StaffMember>;
  /** Staff/Employees authority: suspend or deactivate a linked non-protected account (doc 01 §7). */
  updateLinkedAccountStatus(staffId: string, status: AccountStatus, options?: MockAsyncOptions): Promise<LinkedAccountSummary>;
  update(id: string, input: { displayName?: string; position?: string; departmentId?: string | null; departmentRoleId?: string | null; status?: StaffStatus; avatarUrl?: string | null; accountId?: string | null; email?: string } & StaffProfileInput, options?: MockAsyncOptions): Promise<StaffMember>;
  delete(id: string, options?: MockAsyncOptions): Promise<void>;
}

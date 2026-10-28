import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { StaffMember, StaffStatus } from "@/modules/organization/types";

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

export interface StaffRepository {
  list(options?: MockAsyncOptions): Promise<StaffMember[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<StaffMember | null>;
  create(input: { displayName: string; position: string; departmentId?: string | null; departmentRoleId?: string | null; email: string; avatarUrl?: string | null; accountId?: string | null } & StaffProfileInput, options?: MockAsyncOptions): Promise<StaffMember>;
  update(id: string, input: { displayName?: string; position?: string; departmentId?: string | null; departmentRoleId?: string | null; status?: StaffStatus; avatarUrl?: string | null; accountId?: string | null; email?: string } & StaffProfileInput, options?: MockAsyncOptions): Promise<StaffMember>;
  delete(id: string, options?: MockAsyncOptions): Promise<void>;
}

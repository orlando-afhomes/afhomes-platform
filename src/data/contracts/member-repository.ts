import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { OrgMember } from "@/modules/organization/types";

export type UplineSummary = {
  id: string;
  displayName: string;
  designation: string;
};

export interface MemberRepository {
  list(options?: MockAsyncOptions): Promise<OrgMember[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<OrgMember | null>;
  listUplineSummaries(options?: MockAsyncOptions): Promise<UplineSummary[]>;
}

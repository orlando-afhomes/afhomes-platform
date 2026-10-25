import type { MemberRepository, UplineSummary } from "@/data/contracts/member-repository";
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { DevIdentity } from "@/modules/identity/types";
import type { OrgMember } from "@/modules/organization/types";
import type { MockStore } from "./seed";
import { getUplineSummaries, getVisibleMemberIds, isActiveIdentity } from "./scope";
import { simulateAsync } from "@/data/contracts/async-options";

export class MockMemberRepository implements MemberRepository {
  constructor(
    private readonly store: MockStore,
    private readonly getIdentity: () => DevIdentity,
    private readonly asyncOptions: MockAsyncOptions = {},
  ) {}

  private mergeOptions(options?: MockAsyncOptions) {
    return { ...this.asyncOptions, ...options };
  }

  async list(options?: MockAsyncOptions): Promise<OrgMember[]> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!isActiveIdentity(identity)) return [];
    const visible = getVisibleMemberIds(identity, this.store);
    return this.store.members.filter((member) => visible.has(member.id)).map((member) => ({ ...member }));
  }

  async getById(id: string, options?: MockAsyncOptions): Promise<OrgMember | null> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const visible = await this.list(merged);
    return visible.find((member) => member.id === id) ?? null;
  }

  async listUplineSummaries(options?: MockAsyncOptions): Promise<UplineSummary[]> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!isActiveIdentity(identity)) return [];
    return getUplineSummaries(identity, this.store).map((summary) => ({ ...summary }));
  }
}

import type { MockAsyncOptions } from "@/data/contracts/async-options";
import { simulateAsync } from "@/data/contracts/async-options";
import type { Contract, GenealogyEntry } from "@/modules/contracts/types";
import type { AuditEvent } from "@/modules/audit/types";
import { SYSTEM_ACTOR_ID } from "@/modules/audit/types";
import { hasOperationPermission, type AdminOperation } from "@/modules/identity/permissions";
import type { DevIdentity } from "@/modules/identity/types";
import { manilaToday } from "@/shared/lib/dates";
import { appendAuditEvent } from "./audit";
import { hasBlockedLinkedAccount } from "./authorization";
import { activeRoles } from "./dev-identities";
import type { MockStore } from "./seed";
import { isActiveIdentity } from "./scope";

type AuditInput = Pick<AuditEvent, "module" | "action" | "entityType" | "entityId"> &
  Partial<Pick<AuditEvent, "previousValue" | "newValue" | "reason" | "relatedRecordIds" | "displayReference">>;

/**
 * Shared plumbing for the business-module mock repositories: simulated async
 * options, identity checks, and audit writes. Authorization stays in each
 * repository; frontend navigation is never the only guard.
 */
export abstract class BusinessRepository {
  constructor(
    protected readonly store: MockStore,
    protected readonly getIdentity: () => DevIdentity,
    protected readonly asyncOptions: MockAsyncOptions = {},
  ) {}

  protected async run<T>(options: MockAsyncOptions | undefined, fn: (identity: DevIdentity) => T): Promise<T> {
    await simulateAsync({ ...this.asyncOptions, ...options });
    return fn(this.effectiveIdentity());
  }

  /**
   * A linked account that is not active removes all protected access (doc 01),
   * exactly as resolveEffectiveModules does for the organization modules. The
   * identity is treated as inactive, so every grant and scope check below
   * denies it. Identities without a linked account keep identity-status gating
   * (see hasBlockedLinkedAccount).
   */
  private effectiveIdentity(): DevIdentity {
    const identity = this.getIdentity();
    return hasBlockedLinkedAccount(this.store, identity) ? { ...identity, status: "inactive" } : identity;
  }

  protected can(identity: DevIdentity, operation: AdminOperation): boolean {
    return isActiveIdentity(identity) && hasOperationPermission(identity, operation);
  }

  protected require(identity: DevIdentity, operation: AdminOperation, message: string): void {
    if (!this.can(identity, operation)) throw new Error(message);
  }

  protected audit(identity: DevIdentity | "system", event: AuditInput): void {
    appendAuditEvent(this.store, {
      ...event,
      actorId: identity === "system" ? SYSTEM_ACTOR_ID : identity.id,
      actorRoles: identity === "system" ? ["system"] : activeRoles(identity),
      outcome: "success",
    });
  }
}

export function today(): string {
  return manilaToday();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Seller and upline chain (seller first), as recorded on a contract at preparation time. */
export function genealogyFor(store: MockStore, memberId: string | null): GenealogyEntry[] {
  const chain: GenealogyEntry[] = [];
  const seen = new Set<string>();
  let current = memberId ? store.members.find((member) => member.id === memberId) : undefined;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.push({ memberId: current.id, displayName: current.displayName, designation: current.designation });
    current = current.parentId ? store.members.find((member) => member.id === current!.parentId) : undefined;
  }
  return chain;
}

export const BROAD_BUSINESS_ROLES = new Set(["super_admin", "admin", "finance", "clerk"]);
/** Date-only business dates (YYYY-MM-DD, Asia/Manila). */
export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Admin, Super Admin and Finance see every contract; sellers see contracts whose recorded team includes them. */
export function canSeeContract(identity: DevIdentity, contract: Pick<Contract, "genealogy">): boolean {
  if (!isActiveIdentity(identity)) return false;
  if (activeRoles(identity).some((role) => BROAD_BUSINESS_ROLES.has(role))) return true;
  return Boolean(identity.memberId) && contract.genealogy.some((entry) => entry.memberId === identity.memberId);
}

export function customerName(store: MockStore, customerId: string): string {
  return store.customers.find((customer) => customer.id === customerId)?.displayName ?? "Unknown customer";
}

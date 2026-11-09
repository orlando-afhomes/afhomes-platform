import type { MemberRepository, UplineSummary } from "@/data/contracts/member-repository";
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { DevIdentity } from "@/modules/identity/types";
import type { Account } from "@/modules/accounts/types";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import type { OrgMember } from "@/modules/organization/types";
import type { CreateAccreditedSellerInput, AccreditedSellerResult, CreateSalesNetworkMemberInput, ReferralSponsorVerificationResult, TransferSalesNetworkMemberTarget, UpdateSalesNetworkMemberInput } from "@/modules/sales-network/types";
import { validateSalesParent, getDirectChildren, isValidParentEdge } from "@/modules/sales-network/genealogy";
import { calculateApprovedExpiry, validateAccreditedSellerFields } from "@/modules/sales-network/accredited-seller";
import { allocateSharedAaNumber, collectReservedAaNumbers, toAaYearMonth, validateManualAaNumber } from "@/modules/accreditation/issuance";
import { manilaToday } from "@/modules/accreditation/dates";
import { resolveEffectiveAccreditationEligibility } from "@/modules/accreditation/eligibility";
import { getUplineSummaries, getVisibleMemberIds, isActiveIdentity } from "./scope";
import { getDescendantIds } from "./scope";
import { hasModuleAccess } from "./authorization";
import { appendAuditEvent } from "./audit";
import { activeRoles } from "./dev-identities";
import { normalizeTin } from "@/shared/utils/input-sanitizers";
import { simulateAsync } from "@/data/contracts/async-options";
import type { MockStore } from "./seed";

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

  async getByAaNumber(aaNumber: string, options?: MockAsyncOptions): Promise<OrgMember | null> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const normalized = aaNumber.trim().toUpperCase();
    if (!normalized) return null;
    const visible = await this.list(merged);
    return visible.find((member) => (member.aaNumber ?? "").toUpperCase() === normalized) ?? null;
  }

  async listUplineSummaries(options?: MockAsyncOptions): Promise<UplineSummary[]> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!isActiveIdentity(identity)) return [];
    return getUplineSummaries(identity, this.store).map((summary) => ({ ...summary }));
  }

  private canManage(identity: DevIdentity): boolean {
    if (!isActiveIdentity(identity)) return false;
    if (!hasModuleAccess(this.store, identity, "sales-network")) return false;
    return identity.roles.some((role) => role === "super_admin" || role === "admin" || role === "svd" || role === "ssm" || role === "sm");
  }

  private visibleIds(identity: DevIdentity): Set<string> {
    if (identity.roles.some((role) => role === "super_admin" || role === "admin")) {
      return new Set(this.store.members.map((member) => member.id));
    }
    return getVisibleMemberIds(identity, this.store);
  }

  private isAdmin(identity: DevIdentity): boolean {
    return identity.roles.some((role) => role === "super_admin" || role === "admin");
  }

  async create(input: CreateSalesNetworkMemberInput, options?: MockAsyncOptions): Promise<OrgMember> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!this.canManage(identity)) throw new Error("Sales Network member creation is not allowed.");
    const name = input.displayName.trim();
    if (!name) throw new Error("Member name is required.");
    if (input.designation === "OST") {
      throw new Error("OST creation is deferred to the Phase 06 referral registration workflow.");
    }
    if (input.designation === "SVD" && input.parentId !== null) {
      throw new Error("SVD cannot have parent.");
    }
    const parent = input.parentId ? this.store.members.find((member) => member.id === input.parentId) ?? null : null;
    if (input.designation !== "SVD" && !parent) throw new Error("Parent member does not exist.");
    if (parent) {
      const validation = validateSalesParent(input.designation, parent, this.store.members, undefined, this.store.accreditations);
      if (!validation.ok) throw new Error(validation.message);
      if (!this.visibleIds(identity).has(parent.id) && !this.isAdmin(identity)) {
        throw new Error("The selected parent is outside the authorized scope.");
      }
    }
    if (input.designation !== "SVD" && !this.canManage(identity)) throw new Error("Sales Network member creation is not allowed.");

    const branchId = input.designation === "SVD"
      ? input.branchId?.trim() || `branch-${this.store.memberSequence}`
      : parent!.branchId;

    const member: OrgMember = {
      id: `mem-${this.store.memberSequence}`,
      displayName: name,
      designation: input.designation,
      branchId,
      parentId: parent?.id ?? null,
      status: input.status ?? "active",
      departmentId: null,
      accountId: input.accountId ?? null,
      teamName: input.designation === "SVD" ? (input.teamName?.trim() || null) : null,
      referralCode: null,
      aaNumber: input.aaNumber ?? null,
      mockAccreditationEligible: input.mockAccreditationEligible ?? true,
      parentHistory: [
        {
          previousParentId: null,
          newParentId: parent?.id ?? null,
          previousBranchId: branchId,
          newBranchId: branchId,
          operation: "create",
          actorId: identity.id,
          changedAt: new Date().toISOString(),
        },
      ],
    };

    this.store.memberSequence += 1;
    this.store.members.push(member);
    appendAuditEvent(this.store, {
      actorId: identity.id,
      actorRoles: activeRoles(identity),
      module: "sales-network",
      action: "MEMBER_CREATED",
      entityType: "member",
      entityId: member.id,
      displayReference: member.aaNumber ?? null,
      newValue: member.designation,
      outcome: "success",
      relatedRecordIds: member.accountId ? [member.accountId] : [],
    });
    return { ...member, parentHistory: member.parentHistory?.map((entry) => ({ ...entry })) };
  }

  async update(id: string, input: UpdateSalesNetworkMemberInput, options?: MockAsyncOptions): Promise<OrgMember> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!this.canManage(identity)) throw new Error("Sales Network member update is not allowed.");
    const visible = this.visibleIds(identity);
    if (!visible.has(id)) throw new Error("Member not found.");
    const member = this.store.members.find((item) => item.id === id);
    if (!member) throw new Error("Member not found.");

    const previousName = member.displayName;
    let changed = false;

    const profile = member.sellerProfile ?? null;
    const hasProfileInput = Object.entries(input).some(([key, value]) => key !== "displayName" && value !== undefined);
    if (!profile && hasProfileInput) {
      throw new Error("This member has no seller profile, so profile fields cannot be edited.");
    }

    if (profile) {
      const setText = (key: "firstName" | "lastName" | "mobileNumber" | "dateOfBirth" | "governmentIdType" | "governmentIdNumber" | "cardApplicationDate" | "programCategory" | "gender" | "civilStatus", value: string | undefined) => {
        if (value === undefined) return;
        const trimmed = value.trim();
        if ((profile[key] as string) !== trimmed) {
          (profile as Record<string, unknown>)[key] = trimmed;
          changed = true;
        }
      };
      const setNullableText = (key: "middleName" | "suffix" | "telephone" | "facebook" | "tin" | "businessEmployer" | "businessAddress" | "jobPosition", value: string | null | undefined) => {
        if (value === undefined) return;
        const trimmed = value?.trim() ? value.trim() : null;
        if ((profile[key] as string | null) !== trimmed) {
          (profile as Record<string, unknown>)[key] = trimmed;
          changed = true;
        }
      };
      const setAddressText = (key: "street" | "province" | "city" | "barangay" | "postalCode", value: string | undefined) => {
        if (value === undefined) return;
        const trimmed = value.trim();
        if (profile.address[key] !== trimmed) {
          profile.address[key] = trimmed;
          changed = true;
        }
      };

      const nameParts = [input.firstName, input.middleName, input.noMiddleName, input.lastName, input.suffix].some(
        (part) => part !== undefined,
      );
      if (nameParts) {
        const pickText = (inputValue: string | null | undefined, current: string | null | undefined): string | null => {
          if (inputValue === undefined) return current?.trim() ? current.trim() : null;
          return inputValue?.trim() ? inputValue.trim() : null;
        };
        const firstName = (input.firstName ?? profile.firstName).trim();
        const middleName = input.noMiddleName ? null : pickText(input.middleName, profile.middleName);
        const lastName = (input.lastName ?? profile.lastName).trim();
        const suffix = pickText(input.suffix, profile.suffix);
        const displayName = [firstName, middleName, lastName, suffix].filter(Boolean).join(" ");
        if (!displayName) throw new Error("Member name is required.");
        if (displayName !== member.displayName) {
          member.displayName = displayName;
          changed = true;
        }
        setText("firstName", firstName);
        setNullableText("middleName", middleName);
        setText("lastName", lastName);
        setNullableText("suffix", suffix);
      }
      setText("mobileNumber", input.mobileNumber !== undefined ? input.mobileNumber.trim() : undefined);
      setText("dateOfBirth", input.dateOfBirth);
      if (input.email !== undefined) {
        const normalizedEmail = input.email.trim().toLowerCase();
        if (!normalizedEmail) throw new Error("Email is required.");
        if (
          this.store.members.some(
            (item) => item.id !== id && item.sellerProfile?.email.toLowerCase() === normalizedEmail,
          )
        ) {
          throw new Error("Email already has seller.");
        }
        if (this.store.accounts.some((item) => item.id !== member.accountId && item.email.toLowerCase() === normalizedEmail)) {
          throw new Error("Email already has account.");
        }
        if (profile.email.toLowerCase() !== normalizedEmail) {
          profile.email = input.email.trim();
          changed = true;
          const account = member.accountId ? this.store.accounts.find((item) => item.id === member.accountId) : null;
          if (account && account.email.toLowerCase() !== normalizedEmail) account.email = input.email.trim();
        }
      }
      setAddressText("street", input.street);
      setAddressText("province", input.province);
      setAddressText("city", input.city);
      setAddressText("barangay", input.barangay);
      if (input.subdivision !== undefined) {
        const trimmedSubdivision = input.subdivision?.trim() ? input.subdivision.trim() : null;
        if ((profile.address.subdivision ?? null) !== trimmedSubdivision) {
          profile.address.subdivision = trimmedSubdivision;
          changed = true;
        }
      }
      setAddressText("postalCode", input.postalCode !== undefined ? input.postalCode.trim() : undefined);
      setNullableText("telephone", input.telephone);
      setNullableText("facebook", input.facebook);
      const tin = normalizeTin(input.tin);
    if (tin !== undefined) setNullableText("tin", tin);
      setNullableText("businessEmployer", input.businessEmployer);
      setNullableText("businessAddress", input.businessAddress);
      setNullableText("jobPosition", input.jobPosition);
      setText("gender", input.gender);
      setText("civilStatus", input.civilStatus);
      setText("governmentIdType", input.governmentIdType);
      setText("governmentIdNumber", input.governmentIdNumber !== undefined ? input.governmentIdNumber.trim() : undefined);
      setText("cardApplicationDate", input.cardApplicationDate);
      setText("programCategory", input.programCategory);
      if (input.vipCardLevel !== undefined && profile.vipCardLevel !== input.vipCardLevel) {
        profile.vipCardLevel = input.vipCardLevel;
        changed = true;
      }
    }

    const account = member.accountId ? this.store.accounts.find((item) => item.id === member.accountId) : null;
    if (account && account.displayName !== member.displayName) account.displayName = member.displayName;

    if (input.displayName !== undefined) {
      const name = input.displayName.trim();
      if (!name) throw new Error("Member name is required.");
      if (name !== member.displayName) {
        member.displayName = name;
        changed = true;
      }
    }

    if (changed) {
      appendAuditEvent(this.store, {
        actorId: identity.id,
        actorRoles: activeRoles(identity),
        module: "sales-network",
        action: "MEMBER_UPDATED",
        entityType: "member",
        entityId: member.id,
        previousValue: previousName,
        newValue: member.displayName,
        outcome: "success",
      });
    }

    return { ...member, parentHistory: member.parentHistory?.map((entry) => ({ ...entry })) };
  }

  async transfer(
    id: string,
    newParentId: string | null,
    options?: MockAsyncOptions & TransferSalesNetworkMemberTarget,
  ): Promise<OrgMember> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!this.canManage(identity)) throw new Error("Sales Network transfer is not allowed.");
    const visible = this.visibleIds(identity);
    if (!visible.has(id)) throw new Error("Member not found.");
    const member = this.store.members.find((item) => item.id === id);
    if (!member) throw new Error("Member not found.");

    const newDesignation = options?.designation ?? member.designation;
    if (member.designation === "SVD" && newDesignation === "SVD") {
      throw new Error("SVD root members cannot be transferred.");
    }
    if (newDesignation === "SVD" && newParentId !== null) {
      throw new Error("SVD cannot have parent.");
    }
    if (member.parentId === newParentId && newDesignation === member.designation) {
      throw new Error("Member already belongs to the selected parent.");
    }

    const newParent = newParentId ? this.store.members.find((item) => item.id === newParentId) ?? null : null;
    if (newDesignation !== "SVD" && !newParent) throw new Error("Receiving parent does not exist.");
    if (newParent && !this.visibleIds(identity).has(newParent.id) && !this.isAdmin(identity)) {
      throw new Error("The receiving parent is outside the authorized scope.");
    }

    const validation = validateSalesParent(newDesignation, newParent, this.store.members, member.id, this.store.accreditations);
    if (!validation.ok) throw new Error(validation.message);

    if (newDesignation !== member.designation) {
      for (const child of getDirectChildren(member.id, this.store.members)) {
        if (!isValidParentEdge(child.designation, newDesignation)) {
          throw new Error(`Transfer blocked: ${child.displayName} (${child.designation}) would lose an eligible sponsor.`);
        }
      }
    }

    let newBranchId: string;
    let newTeamName: string | null;
    if (newDesignation === "SVD") {
      const teamName = (options?.teamName ?? "").trim();
      if (!teamName) throw new Error("Team name is required for SVD.");
      newBranchId = `branch-${this.store.memberSequence}`;
      this.store.memberSequence += 1;
      newTeamName = teamName;
    } else {
      newBranchId = (newParent as OrgMember).branchId;
      newTeamName = null;
    }

    const movedIds = new Set([member.id, ...getDescendantIds(member.id, this.store.members)]);
    const now = new Date().toISOString();
    const nextMembers = this.store.members.map((item) => {
      if (!movedIds.has(item.id)) return { ...item };
      const isRoot = item.id === member.id;
      const entry = {
        previousParentId: item.parentId,
        newParentId: isRoot ? (newParent?.id ?? null) : item.parentId,
        previousBranchId: item.branchId,
        newBranchId,
        operation: "transfer" as const,
        actorId: identity.id,
        changedAt: now,
      };
      return {
        ...item,
        designation: isRoot ? newDesignation : item.designation,
        parentId: isRoot ? (newParent?.id ?? null) : item.parentId,
        branchId: newBranchId,
        teamName: isRoot ? newTeamName : item.teamName,
        parentHistory: [...(item.parentHistory ?? []), entry],
      };
    });

    this.store.members.splice(0, this.store.members.length, ...nextMembers);
    const updated = this.store.members.find((item) => item.id === member.id);
    if (!updated) throw new Error("Transfer commit failed.");
    appendAuditEvent(this.store, {
      actorId: identity.id,
      actorRoles: activeRoles(identity),
      module: "sales-network",
      action: "MEMBER_TRANSFERRED",
      entityType: "member",
      entityId: member.id,
      previousValue: member.parentId,
      newValue: newParent?.id ?? null,
      outcome: "success",
      relatedRecordIds: newParent ? [newParent.id] : [],
    });
    return { ...updated, parentHistory: updated.parentHistory?.map((entry) => ({ ...entry })) };
  }

  async changeStatus(id: string, status: OrgMember["status"], options?: MockAsyncOptions): Promise<OrgMember> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!this.canManage(identity)) throw new Error("Sales Network status change is not allowed.");
    const visible = this.visibleIds(identity);
    if (!visible.has(id)) throw new Error("Member not found.");
    const member = this.store.members.find((item) => item.id === id);
    if (!member) throw new Error("Member not found.");

    if (status === "active" && (member.status === "inactive" || member.status === "suspended") && !this.isAdmin(identity)) {
      throw new Error("Reactivation requires administrator authorization.");
    }
    const previousStatus = member.status;
    member.status = status;
    appendAuditEvent(this.store, {
      actorId: identity.id,
      actorRoles: activeRoles(identity),
      module: "sales-network",
      action: "MEMBER_STATUS_CHANGED",
      entityType: "member",
      entityId: member.id,
      previousValue: previousStatus,
      newValue: status,
      outcome: "success",
    });

    return { ...member, parentHistory: member.parentHistory?.map((entry) => ({ ...entry })) };
  }

  async listEligibleParents(childDesignation: OrgMember["designation"], options?: MockAsyncOptions): Promise<OrgMember[]> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!isActiveIdentity(identity)) return [];
    if (!hasModuleAccess(this.store, identity, "sales-network")) return [];

    const visible = this.visibleIds(identity);
    return this.store.members
      .filter((member) => visible.has(member.id))
      .filter((parent) => validateSalesParent(childDesignation, parent, this.store.members, undefined, this.store.accreditations).ok)
      .map((member) => ({ ...member }));
  }

  async getDirectDownline(id: string, options?: MockAsyncOptions): Promise<OrgMember[]> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!isActiveIdentity(identity)) return [];
    const visible = this.visibleIds(identity);
    if (!visible.has(id)) return [];
    return getDirectChildren(id, this.store.members)
      .filter((member) => visible.has(member.id))
      .map((member) => ({ ...member }));
  }

  async getDescendants(id: string, options?: MockAsyncOptions): Promise<OrgMember[]> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!isActiveIdentity(identity)) return [];
    const visible = this.visibleIds(identity);
    if (!visible.has(id)) return [];
    return this.store.members
      .filter((member) => getDescendantIds(id, this.store.members).has(member.id) && visible.has(member.id))
      .map((member) => ({ ...member }));
  }

  async getParentHistory(id: string, options?: MockAsyncOptions): Promise<NonNullable<OrgMember["parentHistory"]>> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!isActiveIdentity(identity)) return [];
    const visible = this.visibleIds(identity);
    if (!visible.has(id)) return [];
    const member = this.store.members.find((item) => item.id === id);
    return (member?.parentHistory ?? []).map((entry) => ({ ...entry }));
  }

  async lookupReferralCode(code: string, options?: MockAsyncOptions): Promise<OrgMember[]> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const normalized = code.trim();
    if (!normalized) return [];
    return this.store.members
      .filter((member) => member.referralCode === normalized)
      .map((member) => ({ ...member }));
  }

  async resolveReferralSponsor(code: string, options?: MockAsyncOptions): Promise<ReferralSponsorVerificationResult> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const normalized = code.trim();
    if (!normalized) {
      return { ok: false, reason: "EMPTY_INPUT", publicMessage: "Referral code is invalid or currently unavailable." };
    }

    const matches = this.store.members.filter((member) => member.referralCode === normalized);
    if (matches.length === 0) {
      return { ok: false, reason: "NOT_FOUND", publicMessage: "Referral code is invalid or currently unavailable." };
    }
    if (matches.length > 1) {
      return { ok: false, reason: "AMBIGUOUS_CODE", publicMessage: "Referral code is invalid or currently unavailable." };
    }

    const sponsor = matches[0];
    if (sponsor.designation === "OST" || !["SVD", "SSM", "SM"].includes(sponsor.designation)) {
      return { ok: false, reason: "INELIGIBLE_DESIGNATION", publicMessage: "Referral code is invalid or currently unavailable." };
    }
    if (sponsor.status !== "active") {
      return { ok: false, reason: "INACTIVE_SPONSOR", publicMessage: "Referral code is invalid or currently unavailable." };
    }
    const accreditation = resolveEffectiveAccreditationEligibility(sponsor, this.store.accreditations);
    if (!accreditation.eligible) {
      return { ok: false, reason: "INELIGIBLE_ACCREDITATION", publicMessage: "Referral code is invalid or currently unavailable." };
    }

    // No child id: the applicant is new, so passing the sponsor as the child made every sponsor a cycle.
    const eligible = validateSalesParent("OST", sponsor, this.store.members, undefined, this.store.accreditations);
    if (!eligible.ok) {
      return { ok: false, reason: "INVALID_SPONSOR", publicMessage: "Referral code is invalid or currently unavailable." };
    }

    return {
      ok: true,
      sponsor: {
        memberId: sponsor.id,
        displayName: sponsor.displayName,
        designation: sponsor.designation,
        status: sponsor.status,
      },
    };
  }

  private canIssueAccreditation(identity: DevIdentity): boolean {
    // Conservative feature-local boundary (no canonical issuance role exists):
    // only a Super Administrator may complete accreditation + AA issuance.
    return this.isSuperAdmin(identity);
  }

  private isSuperAdmin(identity: DevIdentity): boolean {
    return identity.status === "active" && identity.roles.some((role) => role === "super_admin");
  }

  async createAccreditedSeller(input: CreateAccreditedSellerInput, options?: MockAsyncOptions): Promise<AccreditedSellerResult> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!this.canManage(identity)) throw new Error("Accredited seller creation is not allowed.");
    if (!this.canIssueAccreditation(identity)) {
      throw new Error("Complete Now requires Super Administrator authorization.");
    }

    const fieldError = validateAccreditedSellerFields(input);
    if (fieldError) throw new Error(fieldError);

    const email = input.email.trim();
    const normalizedEmail = email.toLowerCase();

    let account: Account | null = null;
    if (input.sellerIdentity === "existing") {
      const existingAccount = this.store.accounts.find((item) => item.id === input.existingAccountId);
      if (!existingAccount) throw new Error("Selected employee account missing.");
      account = existingAccount;
      if (account.email.toLowerCase() !== normalizedEmail) {
        throw new Error("Email must match account.");
      }
      const linked = this.store.members.find((member) => member.accountId === existingAccount.id);
      if (linked) throw new Error("Employee already has affiliation.");
    } else {
      if (this.store.accounts.some((item) => item.email.toLowerCase() === normalizedEmail)) {
        throw new Error("Email already has account.");
      }
      if (
        this.store.members.some(
          (member) => member.sellerProfile?.email.toLowerCase() === normalizedEmail,
        )
      ) {
        throw new Error("Email already has seller.");
      }
    }

    let parent: OrgMember | null = null;
    if (input.designation !== "SVD") {
      parent = this.store.members.find((member) => member.id === input.parentId) ?? null;
      if (!parent) throw new Error("Selected sponsor no longer exists.");
      if (!this.visibleIds(identity).has(parent.id) && !this.isAdmin(identity)) {
        throw new Error("Sponsor outside authorized scope.");
      }
      const validation = validateSalesParent(input.designation, parent, this.store.members, undefined, this.store.accreditations);
      if (!validation.ok) throw new Error(validation.message);
    } else if (input.parentId !== null) {
      throw new Error("SVD cannot have parent.");
    }

    const yymm = toAaYearMonth(input.approvedStart);
    if (!yymm) throw new Error("Start date must be valid.");
    const prefix = input.mode === "IST" ? "AAI" : "AAO";
    const reserved = collectReservedAaNumbers(this.store.accreditations, this.store.members);
    // Manual numbers are validated against the same reservations; they never
    // advance the shared sequence because automatic allocation always scans
    // from the sequence mark and skips every reserved identifier.
    let aaNumber: string;
    let consumeSequence: number | null = null;
    if (input.aaMethod === "manual") {
      const manualError = validateManualAaNumber(`${prefix}${input.manualAaSuffix ?? ""}`, prefix, input.approvedStart, reserved);
      if (manualError) throw new Error(manualError);
      aaNumber = `${prefix}${(input.manualAaSuffix ?? "").trim().toUpperCase()}`;
    } else {
      const allocation = allocateSharedAaNumber(prefix, yymm, reserved, this.store.accreditationSequence);
      aaNumber = allocation.aaNumber;
      consumeSequence = allocation.sequence + 1;
    }

    const expiryDate = calculateApprovedExpiry(input.approvedStart);
    if (!expiryDate) throw new Error("Start date must be valid.");

    // All validation passed: commit member + account + accreditation together.
    const nowDate = manilaToday();
    const nowIso = new Date().toISOString();
    if (!input.existingAccountId && input.sellerIdentity === "new") {
      account = {
        id: `acct-${this.store.accountSequence}`,
        displayName: `${input.firstName.trim()} ${input.lastName.trim()}`,
        email,
        roleIds: [],
        status: "pending",
        departmentId: null,
        createdAt: nowDate,
      };
      this.store.accountSequence += 1;
      this.store.accounts.push(account);
    }
    if (!account) throw new Error("Account resolution failed.");

    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const middleName = input.noMiddleName ? null : input.middleName.trim();
    const suffix = input.suffix?.trim() ? input.suffix.trim() : null;
    const displayName = [firstName, middleName, lastName, suffix].filter(Boolean).join(" ");
    const branchId = input.designation === "SVD" ? `branch-${this.store.memberSequence}` : (parent as OrgMember).branchId;
    // Pending is the default: the seller record and AA issuance complete while
    // the accreditation itself stays Pending until an authorized approval.
    const adminStatus = input.accreditationStatus === "accredited" ? "active" : "pending";
    const memberId = `mem-${this.store.memberSequence}`;
    const member: OrgMember = {
      id: memberId,
      displayName,
      designation: input.designation,
      branchId,
      parentId: parent?.id ?? null,
      status: "active",
      departmentId: null,
      accountId: account.id,
      teamName: input.designation === "SVD" ? (input.teamName ?? "").trim() || null : null,
      referralCode: null,
      aaNumber,
      mockAccreditationEligible: true,
      parentHistory: [
        {
          previousParentId: null,
          newParentId: parent?.id ?? null,
          previousBranchId: branchId,
          newBranchId: branchId,
          operation: "create",
          actorId: identity.id,
          changedAt: nowIso,
        },
      ],
      sellerProfile: {
        firstName,
        middleName,
        lastName,
        suffix,
        mobileNumber: input.mobileNumber.trim(),
        dateOfBirth: input.dateOfBirth.trim(),
        email,
        profilePhotoName: input.profilePhotoName ?? null,
        profilePhotoUrl: null,
        address: {
          street: input.street.trim(),
          province: input.province.trim(),
          city: input.city.trim(),
          barangay: input.barangay.trim(),
          subdivision: input.subdivision?.trim() ? input.subdivision.trim() : null,
          postalCode: input.postalCode.trim(),
        },
        governmentIdType: input.governmentIdType.trim(),
        governmentIdNumber: input.governmentIdNumber.trim(),
        cardApplicationDate: input.cardApplicationDate.trim(),
        programCategory: input.programCategory.trim(),
        vipCardLevel: input.vipCardLevel,
        gender: input.gender.trim(),
        civilStatus: input.civilStatus.trim(),
        telephone: input.telephone?.trim() ? input.telephone.trim() : null,
        facebook: input.facebook?.trim() ? input.facebook.trim() : null,
        tin: input.tin?.trim() ? input.tin.trim() : null,
        businessEmployer: input.businessEmployer?.trim() ? input.businessEmployer.trim() : null,
        businessAddress: input.businessAddress?.trim() ? input.businessAddress.trim() : null,
        jobPosition: input.jobPosition?.trim() ? input.jobPosition.trim() : null,
        sellerSource: "manual-admin",
        originalAccreditationDate: input.approvedStart.trim(),
        expiryDate,
      },
    };

    const accreditationId = `accr-${this.store.accreditationSequence}`;
    const accreditation: AccreditationRecord = {
      id: accreditationId,
      memberId,
      classification: input.mode,
      adminStatus,
      originalAccreditationDate: input.approvedStart.trim(),
      effectiveDate: input.approvedStart.trim(),
      expiryDate,
      aaNumber,
      history: [
        {
          operation: "created",
          actorId: identity.id,
          changedAt: nowIso,
        },
      ],
    };

    this.store.memberSequence += 1;
    this.store.members.push(member);
    this.store.accreditations.push(accreditation);
    if (consumeSequence !== null) {
      this.store.accreditationSequence = consumeSequence;
    }
    appendAuditEvent(this.store, {
      actorId: identity.id,
      actorRoles: activeRoles(identity),
      module: "sales-network",
      action: "SELLER_CREATED",
      entityType: "member",
      entityId: memberId,
      displayReference: aaNumber,
      newValue: `${input.designation} (${input.accreditationStatus})`,
      outcome: "success",
      reason: `AA issued via ${input.aaMethod}; accreditation ${input.accreditationStatus}`,
      relatedRecordIds: [account.id, accreditationId],
    });

    return { memberId, accountId: account.id, accreditationId, aaNumber, expiryDate };
  }
}

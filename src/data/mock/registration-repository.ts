import type {
  RegistrationCorrectionView,
  RegistrationReceipt,
  RegistrationRepository,
  SubmitRegistrationInput,
} from "@/data/contracts/registration-repository";
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { DevIdentity } from "@/modules/identity/types";
import { allowedValues } from "@/modules/settings/lists";
import type {
  RegistrationApplicant,
  RegistrationApplication,
  RegistrationCompletion,
  RegistrationHistoryEntry,
  RegistrationStatus,
} from "@/modules/accreditation/types";
import type { CreateAccreditedSellerInput } from "@/modules/sales-network/types";
import {
  APPLICANT_ACTOR_ID,
  REGISTRATION_AUDIT_ACTIONS,
  REGISTRATION_NEUTRAL_REFUSAL,
  REGISTRATION_SPONSOR_REFUSAL,
  canDecideRegistrations,
  canReviewRegistrations,
  isAwaitingOffice,
  isDuplicateApplication,
  normalizeApplicant,
  validateApplicant,
  validateCompletion,
  validateDecisionReason,
} from "@/modules/accreditation/registration";
import { normalizePhilippineMobile } from "@/shared/utils/input-sanitizers";
import { simulateAsync } from "@/data/contracts/async-options";
import { appendAuditEvent } from "./audit";
import { activeRoles } from "./dev-identities";
import { randomNumericId } from "./ids";
import { MockMemberRepository } from "./member-repository";
import type { MockStore } from "./seed";

const NOT_ALLOWED = "This action is not allowed.";
const WRONG_STATUS = "This application cannot be changed at its current status.";

const clone = (application: RegistrationApplication): RegistrationApplication => JSON.parse(JSON.stringify(application)) as RegistrationApplication;

function randomHex(bytes: number): string {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

/**
 * Public OST application (doc 03 section 9.2): the applicant submits without signing in; the office
 * (Clerk, Administrator, Super Administrator) checks and completes the entry; the Administrator or
 * Super Administrator approves, returns for correction, or rejects. Approval reuses the existing seller
 * commit in MockMemberRepository, so AA issuance and the two-step rule have one implementation.
 * shortcut: the private correction link is an in-app path shown to the office; email or text delivery waits for the backend.
 */
export class MockRegistrationRepository implements RegistrationRepository {
  constructor(
    private readonly store: MockStore,
    private readonly getIdentity: () => DevIdentity,
    private readonly asyncOptions: MockAsyncOptions = {},
  ) {}

  private merge(options?: MockAsyncOptions) {
    return { ...this.asyncOptions, ...options };
  }

  private members() {
    return new MockMemberRepository(this.store, this.getIdentity, this.asyncOptions);
  }

  async list(options?: MockAsyncOptions): Promise<RegistrationApplication[]> {
    await simulateAsync(this.merge(options));
    if (!canReviewRegistrations(this.getIdentity())) return [];
    return this.store.registrationApplications.map(clone);
  }

  async getById(id: string, options?: MockAsyncOptions): Promise<RegistrationApplication | null> {
    await simulateAsync(this.merge(options));
    if (!canReviewRegistrations(this.getIdentity())) return null;
    const application = this.store.registrationApplications.find((item) => item.id === id);
    return application ? clone(application) : null;
  }

  /** Email or mobile number already held by an account or seller record blocks a new application. */
  private matchesExistingPerson(applicant: RegistrationApplicant): boolean {
    return (
      this.store.accounts.some((account) => account.email.trim().toLowerCase() === applicant.email) ||
      this.store.members.some(
        (member) =>
          member.sellerProfile != null &&
          (member.sellerProfile.email.trim().toLowerCase() === applicant.email || normalizePhilippineMobile(member.sellerProfile.mobileNumber) === applicant.mobileNumber),
      )
    );
  }

  private checkApplicant(input: RegistrationApplicant, ignoreId?: string): RegistrationApplicant {
    const applicant = normalizeApplicant(input);
    const errors = Object.values(validateApplicant(applicant));
    if (errors.length > 0) throw new Error(errors[0]);
    if (isDuplicateApplication(applicant, this.store.registrationApplications, ignoreId) || this.matchesExistingPerson(applicant)) {
      throw new Error(REGISTRATION_NEUTRAL_REFUSAL);
    }
    return applicant;
  }

  private audit(
    actorId: string,
    actorRoles: string[],
    action: keyof typeof REGISTRATION_AUDIT_ACTIONS,
    application: RegistrationApplication,
    previous: RegistrationStatus | null,
    reason?: string,
    relatedRecordIds?: string[],
  ) {
    appendAuditEvent(this.store, {
      actorId,
      actorRoles,
      module: "accreditation",
      action,
      entityType: "registration",
      entityId: application.id,
      previousValue: previous,
      newValue: application.status,
      outcome: "success",
      reason: reason ?? null,
      relatedRecordIds,
    });
  }

  private record(
    application: RegistrationApplication,
    operation: RegistrationHistoryEntry["operation"],
    next: RegistrationStatus,
    actorId: string,
    note?: string,
  ): RegistrationStatus {
    const previous = application.status;
    const now = new Date().toISOString();
    application.history.push({ operation, previousStatus: previous, newStatus: next, actorId, changedAt: now, note: note ?? null });
    application.status = next;
    application.updatedAt = now;
    return previous;
  }

  async submit(input: SubmitRegistrationInput, options?: MockAsyncOptions): Promise<RegistrationReceipt> {
    await simulateAsync(this.merge(options));
    const applicant = this.checkApplicant(input.applicant);
    const sponsor = await this.members().resolveReferralSponsor(input.referralCode);
    if (!sponsor.ok) throw new Error(REGISTRATION_SPONSOR_REFUSAL);

    const now = new Date().toISOString();
    const taken = new Set(this.store.registrationApplications.map((item) => item.reference));
    const application: RegistrationApplication = {
      id: `reg-${this.store.registrationSequence}`,
      classification: "OST",
      memberId: null,
      accountId: null,
      sponsorMemberId: sponsor.sponsor.memberId,
      sponsorLabel: `${sponsor.sponsor.displayName} (${sponsor.sponsor.designation})`,
      status: "submitted",
      createdAt: now,
      updatedAt: now,
      submittedAt: now,
      decidedAt: null,
      reviewerId: null,
      history: [{ operation: "submitted", previousStatus: null, newStatus: "submitted", actorId: APPLICANT_ACTOR_ID, changedAt: now, note: null }],
      reference: `OSTA-${randomNumericId(new Set([...taken].map((reference) => reference.slice(5))), 8)}`,
      applicant,
      version: 1,
      versions: [{ version: 1, submittedAt: now, applicant, returnReason: null }],
      completion: null,
      correctionToken: null,
      decisionReason: null,
    };
    this.store.registrationSequence += 1;
    this.store.registrationApplications.push(application);
    this.audit(APPLICANT_ACTOR_ID, [], "REGISTRATION_SUBMITTED", application, null);
    return { reference: application.reference };
  }

  private findByToken(token: string): RegistrationApplication | undefined {
    if (!token) return undefined;
    return this.store.registrationApplications.find((item) => item.status === "needs_info" && item.correctionToken === token);
  }

  async getForCorrection(token: string, options?: MockAsyncOptions): Promise<RegistrationCorrectionView | null> {
    await simulateAsync(this.merge(options));
    const application = this.findByToken(token);
    if (!application) return null;
    return {
      reference: application.reference,
      version: application.version,
      returnReason: application.decisionReason ?? "",
      applicant: { ...application.applicant },
    };
  }

  async resubmit(token: string, input: RegistrationApplicant, options?: MockAsyncOptions): Promise<RegistrationReceipt> {
    await simulateAsync(this.merge(options));
    const application = this.findByToken(token);
    if (!application) throw new Error(REGISTRATION_NEUTRAL_REFUSAL);
    const applicant = this.checkApplicant(input, application.id);

    const now = new Date().toISOString();
    application.version += 1;
    application.applicant = applicant;
    application.versions.push({ version: application.version, submittedAt: now, applicant, returnReason: null });
    application.submittedAt = now;
    application.correctionToken = null;
    const previous = this.record(application, "resubmitted", "submitted", APPLICANT_ACTOR_ID);
    this.audit(APPLICANT_ACTOR_ID, [], "REGISTRATION_RESUBMITTED", application, previous);
    return { reference: application.reference };
  }

  /** Finds the application and checks the actor; throws the same controlled messages every office action uses. */
  private open(id: string, allowed: (identity: DevIdentity) => boolean): { application: RegistrationApplication; identity: DevIdentity } {
    const identity = this.getIdentity();
    if (!allowed(identity)) throw new Error(NOT_ALLOWED);
    const application = this.store.registrationApplications.find((item) => item.id === id);
    if (!application) throw new Error("Application not found.");
    if (!isAwaitingOffice(application.status)) throw new Error(WRONG_STATUS);
    return { application, identity };
  }

  async complete(id: string, completion: RegistrationCompletion, options?: MockAsyncOptions): Promise<RegistrationApplication> {
    await simulateAsync(this.merge(options));
    const { application, identity } = this.open(id, canReviewRegistrations);
    // Active values only, plus the values already saved on this application.
    const saved = application.completion;
    const error = validateCompletion(completion, {
      govIdTypes: allowedValues(this.store.referenceEntries, "gov-id-type", [saved?.governmentIdType]),
      programCategories: allowedValues(this.store.referenceEntries, "program-category", [saved?.programCategory]),
    });
    if (error) throw new Error(error);
    application.completion = { ...completion, governmentIdNumber: completion.governmentIdNumber.trim(), profilePhotoName: completion.profilePhotoName.trim() };
    application.reviewerId = identity.id;
    const previous = this.record(application, "reviewed", "pending_review", identity.id);
    this.audit(identity.id, activeRoles(identity), "REGISTRATION_CHECKED", application, previous);
    return clone(application);
  }

  async returnForCorrection(id: string, reason: string, options?: MockAsyncOptions): Promise<RegistrationApplication> {
    await simulateAsync(this.merge(options));
    const { application, identity } = this.open(id, canDecideRegistrations);
    const reasonError = validateDecisionReason(reason);
    if (reasonError) throw new Error(reasonError);
    const text = reason.trim();
    application.decisionReason = text;
    application.reviewerId = identity.id;
    application.correctionToken = randomHex(16);
    application.versions[application.versions.length - 1].returnReason = text;
    const previous = this.record(application, "info_requested", "needs_info", identity.id, text);
    this.audit(identity.id, activeRoles(identity), "REGISTRATION_RETURNED", application, previous, text);
    return clone(application);
  }

  async reject(id: string, reason: string, options?: MockAsyncOptions): Promise<RegistrationApplication> {
    await simulateAsync(this.merge(options));
    const { application, identity } = this.open(id, canDecideRegistrations);
    const reasonError = validateDecisionReason(reason);
    if (reasonError) throw new Error(reasonError);
    const text = reason.trim();
    application.decisionReason = text;
    application.reviewerId = identity.id;
    application.decidedAt = new Date().toISOString();
    application.correctionToken = null;
    const previous = this.record(application, "rejected", "rejected", identity.id, text);
    this.audit(identity.id, activeRoles(identity), "REGISTRATION_REJECTED", application, previous, text);
    return clone(application);
  }

  async approve(id: string, input: { approvedStart: string }, options?: MockAsyncOptions): Promise<RegistrationApplication> {
    await simulateAsync(this.merge(options));
    const { application, identity } = this.open(id, canDecideRegistrations);
    const { applicant, completion } = application;
    if (!completion || application.status !== "pending_review") {
      throw new Error("Check the application and complete the seller details before approving.");
    }

    // The account is created Pending with no sign-in; the throwaway password only satisfies the shared
    // seller validation and is never stored (an Administrator sets a temporary password later).
    const password = randomHex(16);
    const seller: CreateAccreditedSellerInput = {
      mode: "OST",
      sellerIdentity: "new",
      firstName: applicant.firstName,
      middleName: applicant.middleName,
      noMiddleName: applicant.noMiddleName,
      lastName: applicant.lastName,
      suffix: applicant.suffix || null,
      mobileNumber: applicant.mobileNumber,
      dateOfBirth: applicant.dateOfBirth,
      email: applicant.email,
      tempPassword: password,
      confirmPassword: password,
      profilePhotoName: completion.profilePhotoName,
      street: applicant.street,
      province: applicant.province,
      city: applicant.city,
      barangay: applicant.barangay,
      postalCode: applicant.postalCode,
      designation: "OST",
      parentId: application.sponsorMemberId,
      cardApplicationDate: completion.cardApplicationDate,
      programCategory: completion.programCategory,
      vipCardLevel: completion.vipCardLevel,
      gender: completion.gender,
      civilStatus: completion.civilStatus,
      governmentIdType: completion.governmentIdType,
      governmentIdNumber: completion.governmentIdNumber,
      approvedStart: input.approvedStart,
      accreditationStatus: "accredited",
      aaMethod: "automatic",
    };
    const created = await this.members().commitAccreditedSeller(identity, seller, completion.programCategory);

    application.memberId = created.memberId;
    application.accountId = created.accountId;
    application.reviewerId = identity.id;
    application.decidedAt = new Date().toISOString();
    application.correctionToken = null;
    const previous = this.record(application, "approved", "approved", identity.id);
    this.audit(identity.id, activeRoles(identity), "REGISTRATION_APPROVED", application, previous, undefined, [created.memberId, created.accountId, created.accreditationId]);
    return clone(application);
  }
}

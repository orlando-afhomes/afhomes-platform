import "server-only";
import { randomInt } from "node:crypto";
import { ApiError } from "@/server/api/errors";
import type { Actor } from "@/server/auth/actor";
import type { RegistrationCorrectionView, RegistrationReceipt, SubmitRegistrationInput } from "@/data/contracts/registration-repository";
import type { RegistrationApplicant, RegistrationApplication, RegistrationCompletion, RegistrationStatus } from "@/modules/accreditation/types";
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
import { designationLabel } from "@/modules/sales-network/display";
import type { CreateAccreditedSellerInput } from "@/modules/sales-network/types";
import { allowedValues } from "@/modules/settings/lists";
import { normalizePhilippineMobile } from "@/shared/utils/input-sanitizers";
import { loadReferenceEntries } from "@/server/repositories/content";
import { loadMembers } from "@/server/repositories/sales-network";
import { loadRegistrations, loadRegistration, loadRegistrationByToken, registrationColumns } from "@/server/repositories/sales-network";
import { dbRead, uniqueViolation } from "@/server/db";
import { conflict, invalid, newId, notFound, nowIso, transact } from "@/server/services/common";
import { commitAccreditedSeller, resolveReferralSponsor } from "@/server/services/sales-network";

const audit = (action: string, applicationId: string, details: Record<string, unknown>, relatedRecordIds?: string[]) => ({
  action,
  entityType: "registration" as const,
  entityId: applicationId,
  details: { module: "accreditation", ...details, ...(relatedRecordIds?.length ? { relatedRecordIds } : {}) },
});

// ---------------------------------------------------------------- office reads
export async function listRegistrations(actor: Actor): Promise<RegistrationApplication[]> {
  if (!canReviewRegistrations(actor.identity)) return [];
  return loadRegistrations();
}

export async function getRegistration(actor: Actor, id: string): Promise<RegistrationApplication> {
  if (!canReviewRegistrations(actor.identity)) throw new ApiError(403, "forbidden", "This action is not allowed.");
  const application = await loadRegistration(id);
  if (!application) throw notFound("Application");
  return application;
}

// ---------------------------------------------------------------- public applicant
function randomDigits(length: number): string {
  let value = "";
  for (let index = 0; index < length; index += 1) value += String(randomInt(0, 10));
  return value;
}

function randomHex(bytes: number): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString("hex");
}

/** Email or mobile number already held by an account or seller record blocks a new application. */
async function matchesExistingPerson(applicant: RegistrationApplicant): Promise<boolean> {
  const [accounts, members] = await Promise.all([
    dbRead<{ userAccounts: Array<{ email: string }> }>("query { userAccounts { email } }"),
    loadMembers(),
  ]);
  const email = applicant.email.trim().toLowerCase();
  if (accounts.userAccounts.some((account) => account.email.trim().toLowerCase() === email)) return true;
  return members.some(
    (member) =>
      member.sellerProfile != null &&
      (member.sellerProfile.email.trim().toLowerCase() === email || normalizePhilippineMobile(member.sellerProfile.mobileNumber) === applicant.mobileNumber),
  );
}

async function checkApplicant(input: RegistrationApplicant, ignoreId?: string): Promise<RegistrationApplicant> {
  const applicant = normalizeApplicant(input);
  if (Object.keys(validateApplicant(applicant)).length > 0) {
    const errors = validateApplicant(applicant);
    throw invalid(Object.values(errors)[0]);
  }
  const applications = await loadRegistrations();
  if (isDuplicateApplication(applicant, applications, ignoreId) || (await matchesExistingPerson(applicant))) {
    throw invalid(REGISTRATION_NEUTRAL_REFUSAL);
  }
  return applicant;
}

async function insertApplication(application: RegistrationApplication, auditAction: string): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await transact(null, {
        variableDefinitions: "$d: RegistrationApplication_Data!",
        fields: "application: registrationApplication_insert(data: $d)",
        variables: { d: { ...registrationColumns(application), id: application.id } },
        audit: [audit(auditAction, application.id, { actor: APPLICANT_ACTOR_ID, newValue: application.status })],
      });
      return;
    } catch (error) {
      if (uniqueViolation(error)?.toLowerCase().includes("reference")) {
        application.reference = `OSTA-${randomDigits(8)}`;
        continue;
      }
      throw error;
    }
  }
  throw conflict("reference_busy", "Could not allocate an application reference. Try again.");
}

export async function submitRegistration(input: SubmitRegistrationInput): Promise<RegistrationReceipt> {
  const applicant = await checkApplicant(input.applicant);
  const sponsor = await resolveReferralSponsor(input.referralCode);
  if (!sponsor.ok) throw invalid(REGISTRATION_SPONSOR_REFUSAL);
  const now = nowIso();
  const application: RegistrationApplication = {
    id: newId(),
    classification: "OST",
    memberId: null,
    accountId: null,
    sponsorMemberId: sponsor.sponsor.memberId,
    sponsorLabel: `${sponsor.sponsor.displayName} (${designationLabel(sponsor.sponsor.designation)})`,
    status: "submitted",
    createdAt: now,
    updatedAt: now,
    submittedAt: now,
    decidedAt: null,
    reviewerId: null,
    history: [{ operation: "submitted", previousStatus: null, newStatus: "submitted", actorId: APPLICANT_ACTOR_ID, changedAt: now, note: null }],
    reference: `OSTA-${randomDigits(8)}`,
    applicant,
    version: 1,
    versions: [{ version: 1, submittedAt: now, applicant, returnReason: null }],
    completion: null,
    correctionToken: null,
    decisionReason: null,
  };
  await insertApplication(application, REGISTRATION_AUDIT_ACTIONS.REGISTRATION_SUBMITTED);
  return { reference: application.reference };
}

export async function registrationForCorrection(token: string): Promise<RegistrationCorrectionView | null> {
  const application = await loadRegistrationByToken(token);
  if (!application) return null;
  return { reference: application.reference, version: application.version, returnReason: application.decisionReason ?? "", applicant: { ...application.applicant } };
}

export async function resubmitRegistration(token: string, input: RegistrationApplicant): Promise<RegistrationReceipt> {
  const application = await loadRegistrationByToken(token);
  if (!application) throw invalid(REGISTRATION_NEUTRAL_REFUSAL);
  const applicant = await checkApplicant(input, application.id);
  const now = nowIso();
  const version = application.version + 1;
  const versions = [...application.versions, { version, submittedAt: now, applicant, returnReason: null }];
  const history = [...application.history, { operation: "resubmitted" as const, previousStatus: application.status, newStatus: "submitted" as const, actorId: APPLICANT_ACTOR_ID, changedAt: now, note: null }];
  const previous = application.status;
  await transact(null, {
    variableDefinitions: "$id: UUID!, $data: RegistrationApplication_Data!",
    fields: "application: registrationApplication_update(id: $id, data: $data)",
    variables: { id: application.id, data: { applicant, version, versions, submittedAt: now, correctionToken: null, status: "submitted", history, updatedAt: now } },
    audit: [audit(REGISTRATION_AUDIT_ACTIONS.REGISTRATION_RESUBMITTED, application.id, { actor: APPLICANT_ACTOR_ID, previousValue: previous, newValue: "submitted" })],
  });
  return { reference: application.reference };
}

// ---------------------------------------------------------------- office writes
async function openApplication(actor: Actor, id: string, allowed: (identity: Actor["identity"]) => boolean): Promise<RegistrationApplication> {
  if (!allowed(actor.identity)) throw new ApiError(403, "forbidden", "This action is not allowed.");
  const application = await loadRegistration(id);
  if (!application) throw notFound("Application");
  if (!isAwaitingOffice(application.status)) throw conflict("wrong_status", "This application cannot be changed at its current status.");
  return application;
}

async function saveApplication(actor: Actor, application: RegistrationApplication, action: string, details: Record<string, unknown>, relatedRecordIds?: string[]): Promise<void> {
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $data: RegistrationApplication_Data!",
    fields: "application: registrationApplication_update(id: $id, data: $data)",
    variables: { id: application.id, data: registrationColumns(application) },
    audit: [audit(action, application.id, details, relatedRecordIds)],
  });
}

function record(application: RegistrationApplication, operation: RegistrationApplication["history"][number]["operation"], next: RegistrationStatus, actorId: string, note?: string | null): void {
  application.history = [...application.history, { operation, previousStatus: application.status, newStatus: next, actorId, changedAt: nowIso(), note: note ?? null }];
  application.status = next;
  application.updatedAt = nowIso();
}

export async function completeRegistration(actor: Actor, id: string, completion: RegistrationCompletion): Promise<RegistrationApplication> {
  const application = await openApplication(actor, id, canReviewRegistrations);
  const saved = application.completion;
  const referenceEntries = await loadReferenceEntries();
  const error = validateCompletion(completion, {
    govIdTypes: allowedValues(referenceEntries, "gov-id-type", [saved?.governmentIdType]),
    programCategories: allowedValues(referenceEntries, "program-category", [saved?.programCategory]),
  });
  if (error) throw invalid(error);
  application.completion = { ...completion, governmentIdNumber: completion.governmentIdNumber.trim(), profilePhotoName: completion.profilePhotoName.trim() };
  application.reviewerId = actor.userId;
  const previous = application.status;
  record(application, "reviewed", "pending_review", actor.userId);
  await saveApplication(actor, application, REGISTRATION_AUDIT_ACTIONS.REGISTRATION_CHECKED, { previousValue: previous, newValue: application.status });
  return application;
}

export async function returnRegistration(actor: Actor, id: string, reason: string): Promise<RegistrationApplication> {
  const application = await openApplication(actor, id, canDecideRegistrations);
  const reasonError = validateDecisionReason(reason);
  if (reasonError) throw invalid(reasonError);
  const text = reason.trim();
  application.decisionReason = text;
  application.reviewerId = actor.userId;
  application.correctionToken = randomHex(16);
  application.versions = application.versions.map((version, index) =>
    index === application.versions.length - 1 ? { ...version, returnReason: text } : version,
  );
  const previous = application.status;
  record(application, "info_requested", "needs_info", actor.userId, text);
  await saveApplication(actor, application, REGISTRATION_AUDIT_ACTIONS.REGISTRATION_RETURNED, { previousValue: previous, newValue: application.status, reason: text });
  return application;
}

export async function rejectRegistration(actor: Actor, id: string, reason: string): Promise<RegistrationApplication> {
  const application = await openApplication(actor, id, canDecideRegistrations);
  const reasonError = validateDecisionReason(reason);
  if (reasonError) throw invalid(reasonError);
  const text = reason.trim();
  application.decisionReason = text;
  application.reviewerId = actor.userId;
  application.decidedAt = nowIso();
  application.correctionToken = null;
  const previous = application.status;
  record(application, "rejected", "rejected", actor.userId, text);
  await saveApplication(actor, application, REGISTRATION_AUDIT_ACTIONS.REGISTRATION_REJECTED, { previousValue: previous, newValue: application.status, reason: text });
  return application;
}

export async function approveRegistration(actor: Actor, id: string, input: { approvedStart: string }): Promise<RegistrationApplication> {
  const application = await openApplication(actor, id, canDecideRegistrations);
  const { applicant, completion } = application;
  if (!completion || application.status !== "pending_review") throw conflict("not_reviewed", "Check the application and complete the seller details before approving.");
  const temporary = `Tmp-${newId()}`;
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
    tempPassword: temporary,
    confirmPassword: temporary,
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
  // shortcut: the seller commit and the application update are two transactions; a failed update after
  // a successful commit leaves an approved seller with the application still pending. Reconcile in staging.
  const created = await commitAccreditedSeller(actor, seller, completion.programCategory);
  application.memberId = created.memberId;
  application.accountId = created.accountId;
  application.reviewerId = actor.userId;
  application.decidedAt = nowIso();
  application.correctionToken = null;
  const previous = application.status;
  record(application, "approved", "approved", actor.userId);
  await saveApplication(actor, application, REGISTRATION_AUDIT_ACTIONS.REGISTRATION_APPROVED, { previousValue: previous, newValue: application.status }, [created.memberId, created.accountId, created.accreditationId]);
  return application;
}

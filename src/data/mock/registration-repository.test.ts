import { describe, expect, it } from "vitest";
import { createMockStore, type MockStore } from "@/data/mock/seed";
import { createMockRepositories } from "@/data/mock/repositories";
import { getDevIdentity } from "@/data/mock/dev-identities";
import type { DevIdentity } from "@/modules/identity/types";
import type { RegistrationApplicant, RegistrationCompletion } from "@/modules/accreditation/types";
import { correctionPath, REGISTRATION_NEUTRAL_REFUSAL } from "@/modules/accreditation/registration";

const CODE = "REF-SMALPHA";

const APPLICANT: RegistrationApplicant = {
  firstName: "Liza",
  middleName: "Santos",
  noMiddleName: false,
  lastName: "Navarro",
  suffix: "",
  mobileNumber: "0917-555-8899",
  email: "Liza.Navarro@example.com",
  dateOfBirth: "1992-04-18",
  street: "12 Mabini Street",
  province: "Cebu",
  city: "Cebu City",
  barangay: "Lahug",
  postalCode: "6000",
};

const COMPLETION: RegistrationCompletion = {
  gender: "Female",
  civilStatus: "Single",
  governmentIdType: "Passport",
  governmentIdNumber: "P1234567A",
  cardApplicationDate: "2026-11-01",
  programCategory: "non_vip_client",
  vipCardLevel: "B1",
  profilePhotoName: "liza.jpg",
};

/** The sponsor chain must be approved with a far expiry so the sponsor is eligible. */
function readyStore(): MockStore {
  const store = createMockStore();
  for (const record of store.accreditations) {
    record.adminStatus = "active";
    record.expiryDate = "2099-12-31";
  }
  return store;
}

function repos(store: MockStore, identityId: string | DevIdentity) {
  const identity = typeof identityId === "string" ? getDevIdentity(identityId) : identityId;
  return createMockRepositories(store, () => identity).registrations;
}

async function submitted(store: MockStore) {
  const { reference } = await repos(store, "dev-admin").submit({ referralCode: CODE, applicant: APPLICANT });
  const application = store.registrationApplications.find((item) => item.reference === reference)!;
  return application;
}

describe("OST application submission", () => {
  it("stores a normalized application and issues no seller, account or AA number", async () => {
    const store = readyStore();
    const members = store.members.length;
    const accounts = store.accounts.length;
    const accreditations = store.accreditations.length;
    const application = await submitted(store);
    expect(application.status).toBe("submitted");
    expect(application.reference).toMatch(/^OSTA-\d{8}$/);
    expect(application.sponsorMemberId).toBe("mem-sm-a");
    expect(application.applicant.email).toBe("liza.navarro@example.com");
    expect(application.applicant.mobileNumber).toBe("09175558899");
    expect(application.version).toBe(1);
    expect(application.versions).toHaveLength(1);
    expect(application.memberId).toBeNull();
    expect(store.members).toHaveLength(members);
    expect(store.accounts).toHaveLength(accounts);
    expect(store.accreditations).toHaveLength(accreditations);
    const audit = store.auditEvents.at(-1)!;
    expect(audit.action).toBe("REGISTRATION_SUBMITTED");
    expect(JSON.stringify(audit)).not.toContain("Navarro");
    expect(JSON.stringify(audit)).not.toContain("example.com");
  });

  it("needs no sign-in: any identity, even an inactive one, can submit", async () => {
    const store = readyStore();
    await expect(repos(store, "dev-inactive").submit({ referralCode: CODE, applicant: APPLICANT })).resolves.toHaveProperty("reference");
  });

  it("rejects invalid fields and an unknown referral code with controlled messages", async () => {
    const store = readyStore();
    const repo = repos(store, "dev-admin");
    await expect(repo.submit({ referralCode: CODE, applicant: { ...APPLICANT, email: "nope" } })).rejects.toThrow(/Email must be valid/);
    await expect(repo.submit({ referralCode: CODE, applicant: { ...APPLICANT, mobileNumber: "123" } })).rejects.toThrow(/Mobile/);
    await expect(repo.submit({ referralCode: "WRONG", applicant: APPLICANT })).rejects.toThrow("Referral code is invalid or currently unavailable.");
    expect(store.registrationApplications).toHaveLength(0);
  });

  it("refuses a duplicate applicant with one neutral message", async () => {
    const store = readyStore();
    const repo = repos(store, "dev-admin");
    await repo.submit({ referralCode: CODE, applicant: APPLICANT });
    await expect(repo.submit({ referralCode: CODE, applicant: { ...APPLICANT, firstName: "Other", mobileNumber: "0999 111 2222" } })).rejects.toThrow(REGISTRATION_NEUTRAL_REFUSAL);
    await expect(repo.submit({ referralCode: CODE, applicant: { ...APPLICANT, email: "other@example.com", mobileNumber: "09175558899" } })).rejects.toThrow(REGISTRATION_NEUTRAL_REFUSAL);
    await expect(repo.submit({ referralCode: CODE, applicant: { ...APPLICANT, email: "other@example.com", mobileNumber: "0999 111 2222" } })).rejects.toThrow(REGISTRATION_NEUTRAL_REFUSAL);
    expect(store.registrationApplications).toHaveLength(1);
  });

  it("refuses an email that already belongs to an account", async () => {
    const store = readyStore();
    const email = store.accounts[0].email;
    await expect(repos(store, "dev-admin").submit({ referralCode: CODE, applicant: { ...APPLICANT, email } })).rejects.toThrow(REGISTRATION_NEUTRAL_REFUSAL);
  });
});

describe("OST application review", () => {
  it("lets only reviewers read the queue", async () => {
    const store = readyStore();
    await submitted(store);
    expect(await repos(store, "dev-admin").list()).toHaveLength(1);
    expect(await repos(store, "dev-super-admin").list()).toHaveLength(1);
    for (const id of ["dev-finance", "dev-hr", "dev-svd-a", "dev-ost-a1"]) {
      expect(await repos(store, id).list()).toEqual([]);
    }
  });

  it("checks and completes the entry: Submitted becomes Checked and the check is audited", async () => {
    const store = readyStore();
    const application = await submitted(store);
    const checked = await repos(store, "dev-admin").complete(application.id, COMPLETION);
    expect(checked.status).toBe("pending_review");
    expect(checked.completion?.governmentIdType).toBe("Passport");
    expect(checked.reviewerId).toBe("dev-admin");
    expect(checked.history.at(-1)).toMatchObject({ operation: "reviewed", previousStatus: "submitted", newStatus: "pending_review", actorId: "dev-admin" });
    expect(store.auditEvents.at(-1)).toMatchObject({ action: "REGISTRATION_CHECKED", entityType: "registration", entityId: application.id, previousValue: "submitted", newValue: "pending_review" });
    expect(JSON.stringify(store.auditEvents.at(-1))).not.toContain("P1234567A");
  });

  it("rejects an incomplete entry", async () => {
    const store = readyStore();
    const application = await submitted(store);
    await expect(repos(store, "dev-admin").complete(application.id, { ...COMPLETION, profilePhotoName: "" })).rejects.toThrow(/photo/i);
    await expect(repos(store, "dev-admin").complete(application.id, { ...COMPLETION, governmentIdNumber: "x" })).rejects.toThrow();
    expect(store.registrationApplications[0].status).toBe("submitted");
  });

  it("denies check, decisions and approval to people outside the office", async () => {
    const store = readyStore();
    const application = await submitted(store);
    for (const id of ["dev-finance", "dev-hr", "dev-svd-a", "dev-ost-a1", "dev-inactive"]) {
      const repo = repos(store, id);
      await expect(repo.complete(application.id, COMPLETION)).rejects.toThrow(/not allowed/i);
      await expect(repo.approve(application.id, { approvedStart: "2026-11-13" })).rejects.toThrow(/not allowed/i);
      await expect(repo.returnForCorrection(application.id, "Fix it")).rejects.toThrow(/not allowed/i);
      await expect(repo.reject(application.id, "No")).rejects.toThrow(/not allowed/i);
    }
    expect(store.registrationApplications[0].status).toBe("submitted");
  });

  it("returns for correction with a required reason and a private link, and keeps the same application", async () => {
    const store = readyStore();
    const application = await submitted(store);
    const repo = repos(store, "dev-admin");
    await expect(repo.returnForCorrection(application.id, "   ")).rejects.toThrow(/reason/i);
    const returned = await repo.returnForCorrection(application.id, "Birth date does not match the ID.");
    expect(returned.status).toBe("needs_info");
    expect(returned.decisionReason).toBe("Birth date does not match the ID.");
    expect(returned.correctionToken).toMatch(/^[0-9a-f]{32}$/);
    expect(correctionPath(returned.correctionToken!)).toBe(`/register/ost/correct/${returned.correctionToken}`);
    expect(returned.versions[0].returnReason).toBe("Birth date does not match the ID.");
    expect(store.auditEvents.at(-1)).toMatchObject({ action: "REGISTRATION_RETURNED", previousValue: "submitted", newValue: "needs_info" });
    // A returned application cannot be returned again, rejected or approved until the applicant resubmits.
    await expect(repo.returnForCorrection(application.id, "again")).rejects.toThrow(/cannot/i);
    await expect(repo.reject(application.id, "no")).rejects.toThrow(/cannot/i);
  });

  it("lets the applicant correct through the private link: a new version, one use only", async () => {
    const store = readyStore();
    const application = await submitted(store);
    const returned = await repos(store, "dev-admin").returnForCorrection(application.id, "Wrong birth date.");
    const publicRepo = repos(store, "dev-inactive");
    const view = await publicRepo.getForCorrection(returned.correctionToken!);
    expect(view).toMatchObject({ reference: application.reference, returnReason: "Wrong birth date.", version: 1 });
    expect(JSON.stringify(view)).not.toContain(application.id);
    expect(await publicRepo.getForCorrection("0".repeat(32))).toBeNull();

    await expect(publicRepo.resubmit(returned.correctionToken!, { ...APPLICANT, email: "bad" })).rejects.toThrow(/Email/);
    const receipt = await publicRepo.resubmit(returned.correctionToken!, { ...APPLICANT, dateOfBirth: "1991-04-18" });
    expect(receipt.reference).toBe(application.reference);
    const updated = store.registrationApplications[0];
    expect(updated.status).toBe("submitted");
    expect(updated.version).toBe(2);
    expect(updated.versions.map((version) => version.applicant.dateOfBirth)).toEqual(["1992-04-18", "1991-04-18"]);
    expect(updated.versions[0].returnReason).toBe("Wrong birth date.");
    expect(updated.correctionToken).toBeNull();
    expect(updated.history.at(-1)).toMatchObject({ operation: "resubmitted", previousStatus: "needs_info", newStatus: "submitted", actorId: "applicant" });
    expect(store.auditEvents.at(-1)?.action).toBe("REGISTRATION_RESUBMITTED");
    expect(await publicRepo.getForCorrection(returned.correctionToken!)).toBeNull();
    await expect(publicRepo.resubmit(returned.correctionToken!, APPLICANT)).rejects.toThrow(REGISTRATION_NEUTRAL_REFUSAL);
  });

  it("rejects with a required reason and closes the application", async () => {
    const store = readyStore();
    const application = await submitted(store);
    const repo = repos(store, "dev-super-admin");
    await expect(repo.reject(application.id, "")).rejects.toThrow(/reason/i);
    const rejected = await repo.reject(application.id, "Applicant is not eligible.");
    expect(rejected.status).toBe("rejected");
    expect(rejected.decidedAt).not.toBeNull();
    expect(rejected.correctionToken).toBeNull();
    expect(store.auditEvents.at(-1)).toMatchObject({ action: "REGISTRATION_REJECTED", newValue: "rejected" });
    await expect(repo.approve(application.id, { approvedStart: "2026-11-13" })).rejects.toThrow(/cannot/i);
    // A rejected applicant may apply again.
    await expect(repos(store, "dev-inactive").submit({ referralCode: CODE, applicant: APPLICANT })).resolves.toHaveProperty("reference");
  });

  it("needs the completed entry before approval", async () => {
    const store = readyStore();
    const application = await submitted(store);
    await expect(repos(store, "dev-admin").approve(application.id, { approvedStart: "2026-11-13" })).rejects.toThrow(/complete/i);
  });

  it("approves into the existing seller path: OST under the sponsor, AA number issued, audited", async () => {
    const store = readyStore();
    const application = await submitted(store);
    const repo = repos(store, "dev-admin");
    await repo.complete(application.id, COMPLETION);
    const members = store.members.length;
    const approved = await repo.approve(application.id, { approvedStart: "2026-11-13" });
    expect(approved.status).toBe("approved");
    expect(approved.decidedAt).not.toBeNull();
    expect(store.members).toHaveLength(members + 1);
    const member = store.members.find((item) => item.id === approved.memberId)!;
    expect(member).toMatchObject({ designation: "OST", parentId: "mem-sm-a", status: "active" });
    expect(member.aaNumber).toMatch(/^AAO\d+/);
    expect(member.sellerProfile?.email).toBe("liza.navarro@example.com");
    expect(store.accreditations.some((record) => record.memberId === member.id && record.adminStatus === "active")).toBe(true);
    const account = store.accounts.find((item) => item.id === approved.accountId)!;
    expect(account.status).toBe("pending");
    expect(account.roleIds).toEqual([]);
    expect(approved.history.at(-1)).toMatchObject({ operation: "approved", previousStatus: "pending_review", newStatus: "approved", actorId: "dev-admin" });
    const approvedAudit = store.auditEvents.at(-1)!;
    expect(approvedAudit).toMatchObject({ action: "REGISTRATION_APPROVED", entityId: application.id, relatedRecordIds: expect.arrayContaining([member.id]) });
    expect(store.auditEvents.some((event) => event.action === "SELLER_CREATED")).toBe(true);
    // Final: it cannot be decided twice.
    await expect(repo.approve(application.id, { approvedStart: "2026-11-13" })).rejects.toThrow(/cannot/i);
  });

  it("fails approval cleanly when the sponsor is no longer eligible", async () => {
    const store = readyStore();
    const application = await submitted(store);
    const repo = repos(store, "dev-admin");
    await repo.complete(application.id, COMPLETION);
    store.accreditations.find((record) => record.memberId === "mem-sm-a")!.adminStatus = "suspended";
    const members = store.members.length;
    await expect(repo.approve(application.id, { approvedStart: "2026-11-13" })).rejects.toThrow();
    expect(store.members).toHaveLength(members);
    expect(store.registrationApplications[0].status).toBe("pending_review");
  });

  it("returns only copies of the stored records", async () => {
    const store = readyStore();
    await submitted(store);
    const [listed] = await repos(store, "dev-admin").list();
    listed.applicant.firstName = "Changed";
    listed.versions[0].applicant.firstName = "Changed";
    expect(store.registrationApplications[0].applicant.firstName).toBe("Liza");
    expect(store.registrationApplications[0].versions[0].applicant.firstName).toBe("Liza");
  });
});

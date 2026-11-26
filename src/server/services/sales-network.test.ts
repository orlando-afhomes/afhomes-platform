// @vitest-environment node
// F2: sales network hierarchy, accreditation numbers and the OST registration flow on the local emulators.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { call, configureEmulatorEnv, emulatorsUp, sessionCookieFor } from "@/server/testing/emulator";
import { getCurrentAccreditationRecord } from "@/modules/accreditation/eligibility";
import { manilaToday } from "@/shared/lib/dates";

configureEmulatorEnv();
const up = await emulatorsUp();
const { SEED_ACCOUNTS } = await import("@/data/seed/dev-credentials");
const account = (identityId: string) => SEED_ACCOUNTS.find((row) => row.identityId === identityId)!;

describe.skipIf(!up)("sales network and accreditation (emulators)", () => {
  let network: typeof import("@/server/services/sales-network");
  let accreditation: typeof import("@/server/services/accreditation");
  let registrations: typeof import("@/server/services/registrations");
  let db: typeof import("@/server/db");
  let auth: typeof import("@/server/auth/actor");
  let superAdmin: Awaited<ReturnType<typeof import("@/server/auth/actor").requireActor>>;
  let admin: typeof superAdmin;
  let clerk: typeof superAdmin;
  let hr: typeof superAdmin;
  let ost: typeof superAdmin;
  const createdMemberIds: string[] = [];
  const createdAccountIds: string[] = [];
  const createdAccreditationIds: string[] = [];
  let applicationId: string | null = null;
  const suffix = Date.now();
  const email = `f2-seller-${suffix}@afhomes.local`;
  const applicantEmail = `f2-applicant-${suffix}@example.com`;

  beforeAll(async () => {
    network = await import("@/server/services/sales-network");
    accreditation = await import("@/server/services/accreditation");
    registrations = await import("@/server/services/registrations");
    db = await import("@/server/db");
    auth = await import("@/server/auth/actor");
    const session = await import("@/app/api/v1/session/route");
    const cookie = async (identityId: string) => (await auth.resolveActorFromSessionCookie(await sessionCookieFor(session.POST, account(identityId).email, account(identityId).password)))!;
    superAdmin = await cookie("dev-super-admin");
    admin = await cookie("dev-admin");
    clerk = await cookie("dev-clerk");
    hr = await cookie("dev-hr");
    ost = await cookie("dev-ost-a1");
  }, 60_000);

  afterAll(async () => {
    const { getAuth } = await import("firebase-admin/auth");
    const { getAdminApp } = await import("@/server/firebase-admin");
    if (applicationId) await db.dbWrite(`mutation($id: UUID!) { registrationApplication_delete(id: $id) }`, { id: applicationId }).catch(() => undefined);
    for (const accountId of createdAccountIds) {
      await db.dbWrite(`mutation($id: UUID!) { roleAssignment_deleteMany(where: { userId: { eq: $id } }) }`, { id: accountId }).catch(() => undefined);
      await db.dbWrite(`mutation($id: UUID!) { accountStatusEvent_deleteMany(where: { accountId: { eq: $id } }) }`, { id: accountId }).catch(() => undefined);
      await db.dbWrite(`mutation($id: UUID!) { userAccount_delete(id: $id) }`, { id: accountId }).catch(() => undefined);
    }
    for (const accreditationId of createdAccreditationIds) {
      await db.dbWrite(`mutation($id: UUID!) { accreditationNumber_deleteMany(where: { accreditationId: { eq: $id } }) }`, { id: accreditationId }).catch(() => undefined);
      await db.dbWrite(`mutation($id: UUID!) { accreditation_delete(id: $id) }`, { id: accreditationId }).catch(() => undefined);
    }
    for (const memberId of createdMemberIds) {
      await db.dbWrite(`mutation($id: UUID!) { member_delete(id: $id) }`, { id: memberId }).catch(() => undefined);
    }
    for (const address of [email, applicantEmail]) {
      await getAuth(getAdminApp()).getUserByEmail(address).then((user) => getAuth(getAdminApp()).deleteUser(user.uid)).catch(() => undefined);
    }
  });

  it("scopes the network: office sees all, IST sees the downline, OST sees itself", async () => {
    const office = await network.listMembers(admin);
    expect(office.length).toBeGreaterThanOrEqual(15);
    const seller = await network.listMembers(ost);
    expect(seller.length).toBe(1);
    expect(seller[0].id).toBe(ost.identity.memberId);
  });

  it("refuses to create a member outside the hierarchy rules", async () => {
    await expect(network.createMember(hr, { displayName: "No Rights", designation: "SM", parentId: null })).rejects.toMatchObject({ status: 403 });
    const members = await network.listMembers(admin);
    const ostMember = members.find((member) => member.designation === "OST")!;
    await expect(network.createMember(admin, { displayName: "Bad Parent", designation: "SM", parentId: ostMember.id })).rejects.toMatchObject({ status: 422 });
  });

  it("creates a seller with an issued AA number and renews it with a new number", async () => {
    const members = await network.listMembers(admin);
    const parent = members.find((member) => member.designation === "SM")!;
    const seller = await network.commitAccreditedSeller(superAdmin, {
      mode: "OST", sellerIdentity: "new",
      firstName: "Faye", middleName: "", noMiddleName: true, lastName: "Seller", suffix: null,
      mobileNumber: "09170000001", dateOfBirth: "1990-01-01", email,
      tempPassword: "Tmp-123456789012", confirmPassword: "Tmp-123456789012",
      profilePhotoName: "f2.jpg", street: "1 Test Street", province: "Laguna", city: "Calamba", barangay: "Banlic", postalCode: "4027",
      designation: "OST", parentId: parent.id,
      cardApplicationDate: "2025-08-01", programCategory: "non_vip_client", vipCardLevel: "B1",
      gender: "Male", civilStatus: "Single", governmentIdType: "Passport", governmentIdNumber: "P1234567",
      approvedStart: "2025-09-01", accreditationStatus: "accredited", aaMethod: "automatic",
    });
    createdMemberIds.push(seller.memberId);
    createdAccountIds.push(seller.accountId);
    createdAccreditationIds.push(seller.accreditationId);
    expect(seller.aaNumber).toMatch(/^AAO\d{8}$/);

    const renewed = await accreditation.renewAccreditation(admin, seller.accreditationId);
    expect(renewed.aaNumber).not.toBe(seller.aaNumber);
    expect(renewed.effectiveDate).not.toBeNull();
    expect((renewed.effectiveDate ?? "") <= manilaToday()).toBe(true);
    expect(renewed.history.some((entry) => entry.operation === "renewed")).toBe(true);

    const oldNumber = await accreditation.resolveAaNumberForActor(admin, seller.aaNumber);
    expect(oldNumber).toMatchObject({ recordId: seller.accreditationId, currentAaNumber: renewed.aaNumber, quotedNumberIsCurrent: false });
  });

  it("verifies publicly with a restricted projection and no validity date", async () => {
    expect(createdAccreditationIds.length).toBeGreaterThan(0);
    const records = await accreditation.listAccreditations(admin);
    // Only a member's CURRENT record is publicly verifiable; an older number is superseded.
    const visibleRecords = new Map<string, typeof records>();
    for (const record of records) visibleRecords.set(record.memberId, [...(visibleRecords.get(record.memberId) ?? []), record]);
    const active = [...visibleRecords.values()]
      .map((memberRecords) => getCurrentAccreditationRecord(memberRecords))
      .find((record) => record?.adminStatus === "active" && record.aaNumber);
    expect(active).toBeTruthy();
    const publicRoute = await import("@/app/api/v1/public/accreditation/route");
    const found = await call(publicRoute.GET, { path: `/api/v1/public/accreditation?number=${active!.aaNumber}` });
    expect(found.status).toBe(200);
    expect(found.body.result.validUntil).toBeNull();
    expect(found.body.result.maskedName).toMatch(/\*/);
    expect(JSON.stringify(found.body)).not.toContain("memberId");
    const missing = await call(publicRoute.GET, { path: "/api/v1/public/accreditation?number=AAI00000000" });
    expect(missing.body.result).toBeNull();
  });

  it("runs the public OST application through office review to an approved seller", async () => {
    const members = await network.listMembers(admin);
    const sponsor = members.find((member) => member.designation === "SM" && member.referralCode);
    expect(sponsor?.referralCode).toBeTruthy();
    const submit = await import("@/app/api/v1/public/registrations/route");
    const submitted = await call(submit.POST, {
      path: "/api/v1/public/registrations",
      method: "POST",
      body: {
        referralCode: sponsor!.referralCode,
        applicant: {
          firstName: "Faye", middleName: "", noMiddleName: true, lastName: "Applicant", suffix: "",
          mobileNumber: "09170000002", email: applicantEmail, dateOfBirth: "1991-02-02",
          street: "2 Test Street", province: "Laguna", city: "Calamba", barangay: "Banlic", postalCode: "4027",
        },
      },
    });
    expect(submitted.status).toBe(201);
    expect(submitted.body.reference).toMatch(/^OSTA-\d{8}$/);
    const queue = await registrations.listRegistrations(clerk);
    applicationId = queue.find((item) => item.reference === submitted.body.reference)!.id;

    const completed = await registrations.completeRegistration(clerk, applicationId, {
      gender: "Female", civilStatus: "Single", governmentIdType: "Passport", governmentIdNumber: "P7654321",
      cardApplicationDate: "2026-11-01", programCategory: "non_vip_client", vipCardLevel: "B1", profilePhotoName: "applicant.jpg",
    });
    expect(completed.status).toBe("pending_review");

    const approved = await registrations.approveRegistration(admin, applicationId, { approvedStart: "2026-11-25" });
    expect(approved.status).toBe("approved");
    expect(approved.memberId).toBeTruthy();
    expect(approved.accountId).toBeTruthy();
    createdMemberIds.push(approved.memberId!);
    createdAccountIds.push(approved.accountId!);
    const created = await accreditation.listMemberAccreditations(admin, approved.memberId!);
    createdAccreditationIds.push(...created.map((record) => record.id));
  }, 60_000);

  it("denies accreditation status changes to an Administrator", async () => {
    expect(createdAccreditationIds.length).toBeGreaterThan(0);
    await expect(accreditation.updateAccreditationStatus(admin, createdAccreditationIds[0], "cancel", undefined, "Test")).rejects.toMatchObject({ status: 403 });
  });
});

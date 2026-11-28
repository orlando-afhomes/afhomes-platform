// @vitest-environment node
// F2: sales network hierarchy, accreditation numbers and the OST registration flow on the local emulators.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { call, configureEmulatorEnv, emulatorsUp, sessionCookieFor } from "@/server/testing/emulator";
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
  let svd: typeof superAdmin;
  const createdMemberIds: string[] = [];
  const createdAccountIds: string[] = [];
  const createdAccreditationIds: string[] = [];
  let renewedAaNumber = "";
  let sellerMemberId = "";
  let sellerAccountId = "";
  let roleTestAccountId = "";
  let applicationId: string | null = null;
  const suffix = Date.now();
  const email = `f2-seller-${suffix}@afhomes.local`;
  const roleTestEmail = `f2-role-${suffix}@afhomes.local`;
  const leaderTargetEmail = `f2-leader-target-${suffix}@afhomes.local`;
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
    svd = await cookie("dev-svd-a");
  }, 60_000);

  afterAll(async () => {
    const { getAuth } = await import("firebase-admin/auth");
    const { getAdminApp } = await import("@/server/firebase-admin");
    if (applicationId) await db.dbWrite(`mutation($id: UUID!) { registrationApplication_delete(id: $id) }`, { id: applicationId }).catch(() => undefined);
    for (const accountId of [...createdAccountIds, roleTestAccountId].filter(Boolean)) {
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
    for (const address of [email, roleTestEmail, leaderTargetEmail, applicantEmail]) {
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
    sellerMemberId = seller.memberId;
    sellerAccountId = seller.accountId;
    expect(seller.aaNumber).toMatch(/^AAO\d{8}$/);
    const { loadAccount } = await import("@/server/repositories/organization");
    const account = await loadAccount(seller.accountId);
    expect(account?.roleIds).toContain("ost");

    const renewed = await accreditation.renewAccreditation(admin, seller.accreditationId);
    expect(renewed.aaNumber).not.toBe(seller.aaNumber);
    expect(renewed.effectiveDate).not.toBeNull();
    expect((renewed.effectiveDate ?? "") <= manilaToday()).toBe(true);
    expect(renewed.history.some((entry) => entry.operation === "renewed")).toBe(true);

    const oldNumber = await accreditation.resolveAaNumberForActor(admin, seller.aaNumber);
    expect(oldNumber).toMatchObject({ recordId: seller.accreditationId, currentAaNumber: renewed.aaNumber, quotedNumberIsCurrent: false });
    renewedAaNumber = renewed.aaNumber ?? "";
  });

  it("rejects a member ID number that is invalid for its selected type", async () => {
    await expect(network.updateMember(superAdmin, sellerMemberId, {
      governmentIdType: "Digital National ID",
      governmentIdNumber: "AB12CD",
    })).rejects.toMatchObject({ status: 422 });
  });

  it("keeps a legacy Digital National ID saveable when another member field changes", async () => {
    // Represent a record saved by the earlier validator: a six-character digital code.
    const row = await db.dbRead<{ member: { details: Record<string, unknown> | null } | null }>("query($id: UUID!) { member(id: $id) { details } }", { id: sellerMemberId });
    const details = row.member?.details ?? {};
    const profile = (details.sellerProfile ?? {}) as Record<string, unknown>;
    await db.dbWrite("mutation($id: UUID!, $details: Any!) { member_update(id: $id, data: { details: $details }) }", {
      id: sellerMemberId,
      details: { ...details, sellerProfile: { ...profile, governmentIdType: "Digital National ID", governmentIdNumber: "AB12CD" } },
    });
    const updated = await network.updateMember(superAdmin, sellerMemberId, { mobileNumber: "09170000009" });
    expect(updated.sellerProfile?.governmentIdNumber).toBe("AB12CD");
    // The current format still applies the moment the ID itself changes.
    await expect(network.updateMember(superAdmin, sellerMemberId, { governmentIdNumber: "AB1234" })).rejects.toMatchObject({ status: 422 });
  });

  it("assigns the designation role when createMember links an account", async () => {
    const { createAccount } = await import("@/server/services/organization");
    const newAccount = await createAccount(superAdmin, { displayName: "Role Test", email: roleTestEmail, roleIds: ["clerk"] });
    roleTestAccountId = newAccount.id;
    const parent = (await network.listEligibleParents(superAdmin, "SM"))[0]!;
    expect(parent).toBeTruthy();
    const member = await network.createMember(superAdmin, {
      displayName: "Role Test Member",
      designation: "SM",
      parentId: parent.id,
      accountId: newAccount.id,
    });
    createdMemberIds.push(member.id);
    const { loadAccount } = await import("@/server/repositories/organization");
    const linked = await loadAccount(newAccount.id);
    expect(linked?.roleIds).toContain("sm");
    // The account carries the member reference, so the link survives a reload and drives sales scoping.
    const row = await db.dbRead<{ userAccount: { member: { id: string } | null } | null }>("query($id: UUID!) { userAccount(id: $id) { member { id } } }", { id: newAccount.id });
    expect(row.userAccount?.member?.id).toBe(member.id);
    expect((await network.getMember(superAdmin, member.id)).accountId).toBe(newAccount.id);
  });

  it("refuses to link an account and grant a sales role without Accounts authority", async () => {
    const { createAccount } = await import("@/server/services/organization");
    const target = await createAccount(superAdmin, { displayName: "Leader Target", email: leaderTargetEmail, roleIds: ["clerk"] });
    createdAccountIds.push(target.id);
    const parents = await network.listEligibleParents(svd, "SM");
    expect(parents.length).toBeGreaterThan(0);
    await expect(network.createMember(svd, { displayName: "Unauthorized Link", designation: "SM", parentId: parents[0].id, accountId: target.id })).rejects.toMatchObject({ status: 403 });
    const { loadAccount } = await import("@/server/repositories/organization");
    expect((await loadAccount(target.id))?.roleIds).not.toContain("sm");
    const row = await db.dbRead<{ userAccount: { member: { id: string } | null } | null }>("query($id: UUID!) { userAccount(id: $id) { member { id } } }", { id: target.id });
    expect(row.userAccount?.member ?? null).toBeNull();
  });

  it("updates the account role when a member's designation changes", async () => {
    const parent = (await network.listEligibleParents(superAdmin, "SM"))[0]!;
    expect(parent).toBeTruthy();
    await network.transferMember(superAdmin, sellerMemberId, parent.id, { designation: "SM", teamName: null });
    const { loadAccount } = await import("@/server/repositories/organization");
    const linked = await loadAccount(sellerAccountId);
    expect(linked?.roleIds).toContain("sm");
    expect(linked?.roleIds).not.toContain("ost");
  });

  it("refuses a designation change on a linked account without Accounts authority", async () => {
    const visible = await network.listMembers(svd);
    const ost = visible.find((member) => member.designation === "OST" && member.accountId);
    const sponsor = visible.find((member) => member.designation === "SVD");
    expect(ost).toBeTruthy();
    expect(sponsor).toBeTruthy();
    await expect(network.transferMember(svd, ost!.id, sponsor!.id, { designation: "SSM" })).rejects.toMatchObject({ status: 403 });
    // The denied request writes nothing: parent, designation and role stay as they were.
    const after = await network.getMember(svd, ost!.id);
    expect(after.designation).toBe("OST");
    expect(after.parentId).toBe(ost!.parentId);
    const { loadAccount } = await import("@/server/repositories/organization");
    expect((await loadAccount(ost!.accountId!))?.roleIds).toContain("ost");
    expect((await loadAccount(ost!.accountId!))?.roleIds).not.toContain("ssm");
  });

  it("verifies publicly with a restricted projection and no validity date", async () => {
    // Verify the seller created and renewed above: its record is guaranteed current and active.
    // Seeded records can be expired, superseded or ambiguous, so picking one is seed-order roulette.
    expect(renewedAaNumber).not.toBe("");
    const publicRoute = await import("@/app/api/v1/public/accreditation/route");
    const found = await call(publicRoute.GET, { path: `/api/v1/public/accreditation?number=${renewedAaNumber}` });
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

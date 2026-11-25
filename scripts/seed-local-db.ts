// Seeds the LOCAL SQL Connect emulator with the synthetic pilot records.
// Run: npm run db:seed   (the emulator must be running: npm run emulators)
// Safety: refuses any host except localhost and any project not starting with "demo-".
// Each run wipes the pilot tables first, so running it twice gives the same counts.
import { DEV_IDENTITIES } from "@/data/mock/dev-identities";
import { MOCK_ACCOUNTS } from "@/data/mock/mock-credentials";
import { buildPaymentSchemes, buildProducts } from "@/data/mock/seed/catalog";
import { buildSeed } from "@/data/mock/seed/index";
import { buildDepartments, buildRoles } from "@/data/mock/seed/organization";
import { PRINT_TEMPLATES } from "@/modules/contracts/print-templates";
import { seedExperiences } from "@/modules/experiences/sample-seed";
import { activeRoles } from "@/modules/identity/active-roles";
import { seedOutlets, seedReferenceEntries } from "@/modules/settings/lists";
import { seedTierLevels } from "@/modules/vip/tier-levels";
import { centavosToInt64 } from "@/server/money";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "@/server/firebase-admin";

const PROJECT = process.env.FIREBASE_PROJECT_ID ?? "demo-afhomes";
const HOST = process.env.DATA_CONNECT_EMULATOR_HOST ?? "127.0.0.1:9399";
const SERVICE = "afhomes";
const LOCATION = "asia-southeast1";
const DRY = process.argv.includes("--dry");
// Clean start: one Super Admin, no members or business records. Reference data is added by F0's next slice.
const CLEAN = process.argv.includes("--clean");

if (!PROJECT.startsWith("demo-")) throw new Error(`Refusing to seed project "${PROJECT}": only demo- projects are allowed.`);
if (!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(HOST)) throw new Error(`Refusing to seed host "${HOST}": only the local emulator is allowed.`);

type Json = Record<string, unknown>;
const endpoint = `http://${HOST}/v1/projects/${PROJECT}/locations/${LOCATION}/services/${SERVICE}:executeGraphql`;

async function gql(query: string, variables?: Json): Promise<Json> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await response.json()) as { data?: Json; errors?: Array<{ message: string }> };
  if (body.errors?.length) throw new Error(body.errors.map((error) => error.message).join("; "));
  return body.data ?? {};
}

async function insert(typeName: string, table: string, data: Json): Promise<string | undefined> {
  const result = await gql(`mutation($d: ${typeName}_Data!) { ${table}_insert(data: $d) }`, { d: data });
  return (result[`${table}_insert`] as { id?: string } | undefined)?.id;
}

// Some seed timestamps are date-only strings; read them as Manila midnight (+08:00).
const ts = (value: unknown) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+08:00` : value ?? undefined);

const clean = (value: Json) => Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Json;
const pick = (source: Json, keys: string[]) => {
  const picked: Json = {};
  const rest: Json = { ...source };
  for (const key of keys) {
    picked[key] = source[key];
    delete rest[key];
  }
  return { picked, rest };
};

/**
 * JSON snapshots in the sample seed mention sample member ids. The server carries the
 * inserted member UUIDs, so record scope must compare the same ids: rewrite them here.
 */
const mapMemberRefs = (entries: unknown) =>
  Array.isArray(entries)
    ? entries.map((entry) => {
        const row = entry as Json;
        return { ...row, memberId: memberIds.get(row.memberId as string) ?? row.memberId };
      })
    : entries;
const withMappedMembers = (rest: Json) => {
  const details = { ...rest };
  if (details.genealogy) details.genealogy = mapMemberRefs(details.genealogy);
  if (details.team) details.team = mapMemberRefs(details.team);
  return details;
};

const seed = buildSeed();
const identities = CLEAN ? DEV_IDENTITIES.filter((identity) => identity.id === "dev-super-admin") : DEV_IDENTITIES;
const members = CLEAN ? [] : seed.members;
const customers = CLEAN ? [] : seed.customers;
const contracts = CLEAN ? [] : seed.contracts;
const sales = CLEAN ? [] : seed.sales;
const payments = CLEAN ? [] : seed.payments;

const tierLevels = seedTierLevels();
const products = buildProducts();
const paymentSchemes = buildPaymentSchemes();
const experiences = seedExperiences();
const outlets = seedOutlets();
const referenceEntries = seedReferenceEntries();
const printTemplates = PRINT_TEMPLATES;

if (DRY) {
  console.log(JSON.stringify({ mode: CLEAN ? "clean" : "fixtures", userAccounts: identities.length, members: members.length, customers: customers.length, contracts: contracts.length, sales: sales.length, payments: payments.length, tierLevels: tierLevels.length, products: products.length, paymentSchemes: paymentSchemes.length, experiences: experiences.length, outlets: outlets.length, referenceEntries: referenceEntries.length, printTemplates: printTemplates.length }));
  process.exit(0);
}

const TABLES_TO_WIPE = ["product", "paymentScheme", "tierLevel", "experience", "outlet", "referenceEntry", "printTemplate", "payment", "saleAdjustment", "sale", "contract", "customer", "auditEvent", "idempotencyRecord", "roleAssignment", "accountStatusEvent", "userAccount", "staffMember", "departmentRole", "department"];
for (const table of TABLES_TO_WIPE) await gql(`mutation { ${table}_deleteMany(all: true) }`);
// Members reference themselves, so break the parent links before deleting them.
await gql(`mutation { member_updateMany(all: true, data: { parentId: null }) }`);
await gql(`mutation { member_deleteMany(all: true) }`);

// Receipt files live in private storage, not in the SQL tables. Clear them so a reseed is a true reset.
try {
  const bucket = getStorage(getAdminApp()).bucket(process.env.FIREBASE_STORAGE_BUCKET ?? `${PROJECT}.appspot.com`);
  const [files] = await bucket.getFiles({ prefix: "payments/" });
  await Promise.all(files.map((file) => file.delete().catch(() => undefined)));
} catch (error) {
  console.warn(`Receipt files were not cleared: ${error instanceof Error ? error.message : String(error)}`);
}

// Confirmed reference data (docs 05 and 06). It is configuration, not sample records: both seeds load it.
const tierLevelIds = new Map<string, string>();
for (const level of tierLevels) {
  const id = await insert("TierLevel", "tierLevel", { key: level.id, name: level.name, colorKey: level.colorKey, sortOrder: level.sortOrder, status: level.status });
  tierLevelIds.set(level.id, id!);
}
for (const product of products) {
  await insert("Product", "product", clean({
    code: product.code,
    name: product.name,
    tierLevelId: tierLevelIds.get(product.tierLevelId),
    priceCentavos: centavosToInt64(product.priceCentavos),
    priceStatus: product.priceStatus,
    priceNote: product.priceNote ?? undefined,
    validityYears: product.validityYears,
    earningCycles: product.earningCycles,
    vipDiscountPercent: product.vipDiscountPercent,
    lifetimePoints: product.lifetimePoints,
    pointsPerCycle: product.pointsPerCycle,
    weekdayPointsPerCycle: product.weekdayPointsPerCycle,
    weekendPointsPerCycle: product.weekendPointsPerCycle,
    minSpendPerCycleCentavos: centavosToInt64(product.minSpendPerCycleCentavos),
    supplementaryHolders: product.supplementaryHolders,
    description: product.description ?? undefined,
    benefitsSummary: product.benefitsSummary ?? undefined,
    imageUrl: product.imageUrl ?? undefined,
    imageFileName: product.imageFileName ?? undefined,
    status: product.status,
    approvalStatus: product.approvalStatus,
    publiclyListed: product.publiclyListed,
    configVersion: product.configVersion,
    effectiveDate: product.effectiveDate ?? undefined,
    changes: product.changes,
  }));
}
for (const [index, scheme] of paymentSchemes.entries()) {
  await insert("PaymentScheme", "paymentScheme", clean({
    key: scheme.id,
    label: scheme.label,
    historicalLabel: scheme.historicalLabel ?? undefined,
    category: scheme.category,
    paymentCode: scheme.paymentCode ?? undefined,
    paymentCodeByTier: scheme.paymentCodeByTier ?? undefined,
    applicableTiers: scheme.applicableTiers,
    reservationCentavos: scheme.reservationCentavos === null ? undefined : centavosToInt64(scheme.reservationCentavos),
    installmentCount: scheme.installmentCount ?? undefined,
    installmentCentavosByTier: scheme.installmentCentavosByTier,
    priceCentavosByTier: scheme.priceCentavosByTier,
    installmentCountByTier: scheme.installmentCountByTier ?? undefined,
    downPaymentBasisPoints: scheme.downPaymentBasisPoints ?? undefined,
    commercialStatus: scheme.commercialStatus,
    source: scheme.source,
    availability: scheme.availability,
    ownerHold: scheme.ownerHold ?? undefined,
    configVersion: scheme.configVersion,
    effectiveDate: scheme.effectiveDate ?? undefined,
    changes: scheme.changes,
    sortOrder: index + 1,
  }));
}

for (const experience of experiences) {
  await insert("Experience", "experience", {
    key: experience.id,
    slug: experience.slug,
    title: experience.title,
    category: experience.category,
    summary: experience.summary,
    status: experience.status,
    statusTone: experience.statusTone,
    image: experience.image,
    overview: experience.overview,
    highlights: experience.highlights,
    standard: experience.standard,
    published: experience.published,
    createdAt: experience.createdAt,
    updatedAt: experience.updatedAt,
  });
}
for (const outlet of outlets) {
  await insert("Outlet", "outlet", { key: outlet.id, name: outlet.name, type: outlet.type, status: outlet.status, sample: outlet.sample });
}
for (const entry of referenceEntries) {
  await insert("ReferenceEntry", "referenceEntry", {
    key: entry.id, list: entry.list, value: entry.value, label: entry.label, status: entry.status, sortOrder: entry.sortOrder,
  });
}
for (const [index, template] of printTemplates.entries()) {
  await insert("PrintTemplate", "printTemplate", clean({
    key: template.key, name: template.name, kind: template.kind, revision: template.revision,
    assetPath: template.assetPath ?? undefined, status: "active", sortOrder: index + 1,
  }));
}

// Members: parents first so every parent id exists.
const memberIds = new Map<string, string>();
const pending = [...members];
while (pending.length) {
  const ready = pending.filter((member) => !member.parentId || memberIds.has(member.parentId));
  if (!ready.length) throw new Error("Member genealogy has a cycle or a missing parent.");
  for (const member of ready) {
    const { picked, rest } = pick(member as unknown as Json, ["id", "displayName", "designation", "branchId", "parentId", "status", "teamName", "referralCode", "aaNumber"]);
    const id = await insert("Member", "member", clean({
      displayName: picked.displayName,
      designation: picked.designation,
      branchId: picked.branchId,
      parentId: member.parentId ? memberIds.get(member.parentId) : undefined,
      status: picked.status,
      teamName: picked.teamName ?? undefined,
      referralCode: picked.referralCode ?? undefined,
      aaNumber: picked.aaNumber ?? undefined,
      details: rest,
    }));
    memberIds.set(member.id, id!);
    pending.splice(pending.indexOf(member), 1);
  }
}

// Sign-in identities and roles. Each account also gets a Firebase Auth emulator user
// (uid = the sample identity id) and is linked to it by `firebaseUid`.
const auth = getAuth(getAdminApp());
const existingAuthUsers = await auth.listUsers(1000);
if (existingAuthUsers.users.length) await auth.deleteUsers(existingAuthUsers.users.map((user) => user.uid));

const userIds = new Map<string, string>();
for (const identity of identities) {
  const account = MOCK_ACCOUNTS.find((row) => row.identityId === identity.id);
  if (!account) throw new Error(`No sample sign-in account for ${identity.id}.`);
  await auth.createUser({ uid: identity.id, email: account.email, password: account.password, displayName: identity.displayName });
  const id = await insert("UserAccount", "userAccount", clean({
    firebaseUid: identity.id,
    email: account.email,
    displayName: identity.displayName,
    status: identity.status === "active" ? "active" : "deactivated",
    portal: account.portal,
    memberId: identity.memberId ? memberIds.get(identity.memberId) : undefined,
  }));
  userIds.set(identity.id, id!);
  const active = new Set(activeRoles(identity));
  const assignments = identity.roleAssignments ?? identity.roles.map((role) => ({ role, status: "active" as const }));
  for (const assignment of assignments) {
    await gql(`mutation($d: RoleAssignment_Data!) { roleAssignment_insert(data: $d) }`, {
      d: { userId: id, role: assignment.role, status: assignment.status === "active" && (active.has(assignment.role) || identity.status !== "active") ? "active" : "inactive" },
    });
  }
}

// Organization fixtures (rich seed only; the clean start keeps a single Super Admin):
// departments, delegable department roles, and office staff linked to their sign-in
// accounts. A linked role grants modules the account already holds, so effective
// access does not change; sensitive operations still come from the system role.
if (!CLEAN) {
  const departmentIds = new Map<string, string>();
  for (const department of buildDepartments()) {
    const id = await insert("Department", "department", {
      name: department.name,
      code: department.code,
      description: department.description,
      status: department.status,
    });
    departmentIds.set(department.id, id!);
  }
  const roleIds = new Map<string, string>();
  for (const role of buildRoles()) {
    const id = await insert("DepartmentRole", "departmentRole", {
      name: role.name,
      departmentId: departmentIds.get(role.departmentId),
      moduleIds: role.moduleIds,
      status: role.status,
      isProtected: role.isProtected ?? false,
    });
    roleIds.set(role.id, id!);
  }
  const cleanName = (displayName: string) => displayName.split(" · ")[0];
  const linkedStaff: Array<{ identityId: string; position: string; departmentId: string; roleId: string }> = [
    { identityId: "dev-super-admin", position: "Super Administrator", departmentId: "dept-admin", roleId: "role-super-admin" },
    { identityId: "dev-admin", position: "Administrator", departmentId: "dept-admin", roleId: "role-admin" },
    { identityId: "dev-hr", position: "HR Specialist", departmentId: "dept-hr", roleId: "role-hr-staff" },
    { identityId: "dev-finance", position: "Finance Officer", departmentId: "dept-finance", roleId: "role-finance" },
    { identityId: "dev-clerk", position: "Office Clerk", departmentId: "dept-ops", roleId: "role-ops-staff" },
  ];
  for (const spec of linkedStaff) {
    const identity = DEV_IDENTITIES.find((row) => row.id === spec.identityId)!;
    const account = MOCK_ACCOUNTS.find((row) => row.identityId === spec.identityId)!;
    const staffId = await insert("StaffMember", "staffMember", {
      displayName: cleanName(identity.displayName),
      position: spec.position,
      departmentId: departmentIds.get(spec.departmentId),
      departmentRoleId: roleIds.get(spec.roleId),
      status: "active",
      email: account.email,
      profile: {},
    });
    await gql(`mutation($id: UUID!, $staff: UUID!) { userAccount_update(id: $id, data: { staffId: $staff }) }`, { id: userIds.get(spec.identityId), staff: staffId });
  }
  // Unlinked office records so the directory also shows employees without accounts.
  for (const extra of [
    { displayName: "Jonathan Villamor", position: "Finance Analyst", departmentId: "dept-finance", roleId: "role-fin-staff", email: "jonathan.villamor@afhomes.com.ph" },
    { displayName: "Gilbert Mercado", position: "Operations Coordinator", departmentId: "dept-ops", roleId: "role-ops-staff", email: "gilbert.mercado@afhomes.com.ph" },
  ]) {
    await insert("StaffMember", "staffMember", {
      displayName: extra.displayName,
      position: extra.position,
      departmentId: departmentIds.get(extra.departmentId),
      departmentRoleId: roleIds.get(extra.roleId),
      status: "active",
      email: extra.email,
      profile: {},
    });
  }
}

const customerIds = new Map<string, string>();
for (const customer of customers) {
  const { picked, rest } = pick(customer as unknown as Json, ["id", "displayName", "branchId", "ownerMemberId", "status", "customerNumber"]);
  const id = await insert("Customer", "customer", clean({
    displayName: picked.displayName,
    branchId: picked.branchId,
    ownerMemberId: picked.ownerMemberId ? memberIds.get(picked.ownerMemberId as string) : undefined,
    status: picked.status,
    customerNumber: picked.customerNumber ?? undefined,
    profile: rest,
  }));
  customerIds.set(customer.id, id!);
}

const contractIds = new Map<string, string>();
for (const contract of contracts) {
  const { picked, rest } = pick(contract as unknown as Json, ["id", "customerId", "productCode", "priceCentavos", "classification", "status", "raNumber", "vipNumber", "signedAgreementRecordedDate", "sellerMemberId", "createdAt"]);
  const id = await insert("Contract", "contract", clean({
    customerId: customerIds.get(contract.customerId),
    productCode: picked.productCode,
    priceCentavos: centavosToInt64(contract.priceCentavos),
    classification: picked.classification,
    status: picked.status,
    raNumber: picked.raNumber ?? undefined,
    vipNumber: picked.vipNumber ?? undefined,
    signedAgreementRecordedDate: picked.signedAgreementRecordedDate ?? undefined,
    sellerMemberId: contract.sellerMemberId ? memberIds.get(contract.sellerMemberId) : undefined,
    createdAt: ts(picked.createdAt),
    details: withMappedMembers(rest),
  }));
  contractIds.set(contract.id, id!);
}

// Sales and their dated adjustment ledger (one sale per contract).
for (const sale of sales) {
  if (!contractIds.has(sale.contractId)) continue;
  const { picked, rest } = pick(sale as unknown as Json, ["id", "contractId", "customerId", "productCode", "branchId", "valueCentavos", "recordedDate", "approval", "sellerMemberId", "referrerMemberId", "status", "confirmedDate", "adjustments"]);
  const approval = sale.approval;
  const saleId = await insert("Sale", "sale", clean({
    contractId: contractIds.get(sale.contractId),
    customerId: customerIds.get(sale.customerId),
    productCode: picked.productCode,
    branchId: picked.branchId,
    valueCentavos: centavosToInt64(sale.valueCentavos),
    recordedDate: picked.recordedDate,
    sellerMemberId: sale.sellerMemberId ? memberIds.get(sale.sellerMemberId) : undefined,
    referrerMemberId: sale.referrerMemberId ? memberIds.get(sale.referrerMemberId) : undefined,
    status: picked.status,
    approvedById: approval ? userIds.get(approval.approvedBy) : undefined,
    approvedAt: approval ? ts(approval.approvedAt) : undefined,
    confirmedDate: picked.confirmedDate ?? undefined,
    details: withMappedMembers(rest),
  }));
  for (const adjustment of sale.adjustments) {
    await insert("SaleAdjustment", "saleAdjustment", clean({
      saleId, date: adjustment.date, amountCentavos: centavosToInt64(adjustment.amountCentavos), kind: adjustment.kind, reason: adjustment.reason, actorId: userIds.get(adjustment.actorId),
    }));
  }
}

// IGP receipts point at IGP projects (doc 14), which are not part of the pilot schema.
const pilotPayments = payments.filter((payment) => contractIds.has(payment.contractId));
console.log(`Skipping ${payments.length - pilotPayments.length} IGP receipts (IGP is not in the pilot).`);
for (const payment of pilotPayments) {
  const { picked, rest } = pick(payment as unknown as Json, ["id", "contractId", "customerId", "purpose", "amountCentavos", "method", "paidDate", "countedDate", "referenceNo", "documentNo", "status", "submittedBy", "submittedAt", "verifiedBy", "verifiedAt", "verifiedDate", "decisionReason"]);
  await insert("Payment", "payment", clean({
    contractId: contractIds.get(payment.contractId),
    customerId: customerIds.get(payment.customerId),
    purpose: picked.purpose,
    amountCentavos: centavosToInt64(payment.amountCentavos),
    method: picked.method,
    paidDate: picked.paidDate,
    countedDate: picked.countedDate ?? undefined,
    referenceNo: picked.referenceNo ?? undefined,
    documentNo: picked.documentNo ?? undefined,
    status: picked.status,
    submittedById: userIds.get(payment.submittedBy),
    submittedAt: ts(picked.submittedAt),
    verifiedById: payment.verifiedBy ? userIds.get(payment.verifiedBy) : undefined,
    verifiedAt: ts(picked.verifiedAt),
    verifiedDate: picked.verifiedDate ?? undefined,
    decisionReason: picked.decisionReason ?? undefined,
    details: rest,
  }));
}

const counts = await gql(`query { userAccounts { id } roleAssignments { role } members { id } customers { id } contracts { id } sales { id } saleAdjustments { id } payments { id } tierLevels { id } products { id } paymentSchemes { id } experiences { id } outlets { id } referenceEntries { id } printTemplates { id } }`);
console.log(JSON.stringify(Object.fromEntries(Object.entries(counts).map(([name, rows]) => [name, (rows as unknown[]).length]))));

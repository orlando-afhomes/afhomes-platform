import { describe, expect, it } from "vitest";
import type { DevIdentity } from "@/modules/identity/types";
import { AUDIT_ACTIONS, AuditQueryError, type AuditEvent, type AuditQuery } from "@/modules/audit/types";
import { createMockStore } from "./seed";
import { SEED_AUDIT_EVENT_COUNT } from "./seed-data";
import { createMockRepositories } from "./repositories";
import { getDevIdentity } from "./dev-identities";
import { AUDIT_READ_RESTRICTION } from "./audit-repository";

type Store = ReturnType<typeof createMockStore>;

function auditAs(store: Store, identity: DevIdentity | string) {
  const resolved = typeof identity === "string" ? getDevIdentity(identity) : identity;
  return createMockRepositories(store, () => resolved).audit;
}

function pushEvent(store: Store, overrides: Partial<AuditEvent> & Pick<AuditEvent, "action">): AuditEvent {
  const event: AuditEvent = {
    id: `audit-${store.auditSequence}`,
    timestamp: "2026-01-01T00:00:00.000Z",
    actorId: "dev-admin",
    actorRoles: ["admin"],
    module: "organization",
    entityType: "account",
    entityId: "acct-x",
    outcome: "success",
    ...overrides,
  };
  store.auditSequence += 1;
  store.auditEvents.push(event);
  return event;
}

const rejects = async (promise: Promise<unknown>, message?: string) => {
  await expect(promise).rejects.toBeInstanceOf(AuditQueryError);
  if (message) await expect(promise).rejects.toThrow(message);
};

describe("audit read authorization", () => {
  it("lets Super Admin and Admin read events produced by real mutations, including protected-record events", async () => {
    const store = createMockStore();
    const superRepos = createMockRepositories(store, () => getDevIdentity("dev-super-admin"));
    await superRepos.accounts.updateStatus("acct-admin", "suspended");
    await superRepos.accounts.updateStatus("acct-admin", "active");
    const events = store.auditEvents.length;
    expect(events).toBeGreaterThan(0);
    expect((await auditAs(store, "dev-super-admin").list()).total).toBe(events);
    // Admin reads the same history, including events about the Super Admin account.
    const adminRepos = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    const protectedAccount = store.accounts.find((item) => item.roleIds.includes("super_admin"))!;
    pushEvent(store, { action: AUDIT_ACTIONS.ACCOUNT_STATUS_CHANGED, entityId: protectedAccount.id, previousValue: "active", newValue: "suspended" });
    const page = await adminRepos.audit.list({ entityId: protectedAccount.id });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ newValue: "suspended" });
  });

  it("denies every other role and inactive identities with the restriction message", async () => {
    const store = createMockStore();
    pushEvent(store, { action: AUDIT_ACTIONS.ACCOUNT_CREATED });
    for (const id of ["dev-hr", "dev-finance", "dev-svd-a", "dev-ssm-a", "dev-sm-a", "dev-ost-a1", "dev-inactive"]) {
      await expect(auditAs(store, id).list()).rejects.toThrow(AUDIT_READ_RESTRICTION);
    }
    const inactiveAdmin: DevIdentity = { ...getDevIdentity("dev-admin"), id: "inactive-admin", status: "inactive" as DevIdentity["status"] };
    await expect(auditAs(store, inactiveAdmin).list()).rejects.toThrow(AUDIT_READ_RESTRICTION);
  });

  it("denies an Admin whose linked account is not active, before validating the query", async () => {
    const store = createMockStore();
    store.accounts.find((item) => item.id === "acct-admin")!.status = "suspended";
    // An invalid query must not be reported ahead of the authorization denial.
    await expect(auditAs(store, "dev-admin").list({ pageSize: 1000 })).rejects.toThrow(AUDIT_READ_RESTRICTION);
  });

  it("does not grant audit access through a department role", async () => {
    const store = createMockStore();
    store.roles.find((item) => item.id === "role-hr-staff")!.moduleIds = ["dashboard", "departments", "staff", "roles", "accounts"];
    await expect(auditAs(store, "dev-hr").list()).rejects.toThrow(AUDIT_READ_RESTRICTION);
  });
});

describe("audit read filters, ordering, and paging", () => {
  function seeded() {
    const store = createMockStore();
    pushEvent(store, { action: "ACCREDITATION_ISSUED", module: "accreditation", entityType: "accreditation", entityId: "acc-1", timestamp: "2026-01-01T00:00:00.000Z", relatedRecordIds: ["mem-1"], actorId: "dev-admin" });
    pushEvent(store, { action: "MEMBER_STATUS_CHANGED", module: "sales-network", entityType: "member", entityId: "mem-1", timestamp: "2026-01-02T00:00:00.000Z", actorId: "dev-super-admin" });
    pushEvent(store, { action: AUDIT_ACTIONS.ACCOUNT_CREATED, timestamp: "2026-01-02T00:00:00.000Z", entityId: "acct-2", relatedRecordIds: ["mem-1", "other"] });
    pushEvent(store, { action: AUDIT_ACTIONS.STAFF_CREATED, entityType: "staff", entityId: "staff-9", timestamp: "2026-01-03T12:00:00.000Z" });
    return store;
  }

  it("filters by each field", async () => {
    const repo = auditAs(seeded(), "dev-admin");
    const ids = async (query: AuditQuery) => (await repo.list(query)).items.map((item) => item.entityId);
    expect(await ids({ module: "accreditation" })).toEqual(["acc-1"]);
    expect(await ids({ entityType: "staff" })).toEqual(["staff-9"]);
    expect(await ids({ action: "MEMBER_STATUS_CHANGED" })).toEqual(["mem-1"]);
    expect(await ids({ actorId: "dev-super-admin" })).toEqual(["mem-1"]);
    expect(await ids({ entityId: "acct-2" })).toEqual(["acct-2"]);
    expect(await ids({ relatedRecordId: "mem-1" })).toEqual(["acct-2", "acc-1"]);
    expect(await ids({ relatedRecordId: "mem" })).toEqual([]);
    expect(await ids({ from: "2026-01-02", to: "2026-01-02T23:59:59.999Z" })).toEqual(["acct-2", "mem-1"]);
    expect(await ids({ from: "2026-01-03", to: "2026-01-03T23:59:59.999Z" })).toEqual(["staff-9"]);
  });

  it("orders newest first with the audit sequence as a stable tiebreak", async () => {
    const page = await auditAs(seeded(), "dev-admin").list();
    // Seeded display events (Oct 2026) sort before the pushed Jan-2026 events.
    expect(page.items.map((item) => item.entityId)).toEqual([
      "comm-1", "sale-1", "pay-2", "ctr-2", "ctr-1", "ctr-1", "ctr-1", "cust-a1",
      "staff-9", "acct-2", "mem-1", "acc-1",
    ]);
    expect(page.total).toBe(12);
  });

  it("applies the default page size of 25 and the maximum of 100", async () => {
    const store = createMockStore();
    for (let index = 0; index < 120; index += 1) pushEvent(store, { action: AUDIT_ACTIONS.ACCOUNT_CREATED, entityId: `acct-${index}` });
    const repo = auditAs(store, "dev-admin");
    const first = await repo.list();
    expect(first).toMatchObject({ page: 1, pageSize: 25, total: 128 });
    expect(first.items).toHaveLength(25);
    expect((await repo.list({ pageSize: 100 })).items).toHaveLength(100);
    const last = await repo.list({ page: 5 });
    expect(last.items).toHaveLength(25);
    expect((await repo.list({ page: 6 })).items).toHaveLength(3);
    // Pages are disjoint and continuous.
    const second = await repo.list({ page: 2 });
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(50);
  });

  it("rejects invalid pagination, filters, dates, and unknown keys without clamping", async () => {
    const repo = auditAs(createMockStore(), "dev-admin");
    await rejects(repo.list({ page: 0 }), "page");
    await rejects(repo.list({ page: 1.5 }), "page");
    await rejects(repo.list({ pageSize: 0 }), "pageSize");
    await rejects(repo.list({ pageSize: 101 }), "pageSize");
    await rejects(repo.list({ pageSize: "25" as unknown as number }), "pageSize");
    await rejects(repo.list({ module: "payroll" as never }), "module");
    await rejects(repo.list({ entityType: "invoice" as never }), "entityType");
    await rejects(repo.list({ action: "  " }), "action");
    await rejects(repo.list({ actorId: "x".repeat(121) }), "actorId");
    await rejects(repo.list({ from: "not-a-date" }), "from");
    await rejects(repo.list({ to: "2026-13-45" }), "to");
    await rejects(repo.list({ from: "2026-02-01", to: "2026-01-01" }), "from must not be later");
    await rejects(repo.list({ status: "active" } as unknown as AuditQuery), 'Unknown audit query field "status"');
  });
});

describe("audit safe projection", () => {
  it("withholds personal values in staff and member updates but keeps assignment values", async () => {
    const store = createMockStore();
    pushEvent(store, {
      action: AUDIT_ACTIONS.STAFF_UPDATED,
      entityType: "staff",
      previousValue: "displayName:Jane Cruz;email:jane@example.com;department:dept-hr;role:role-hr-staff",
      newValue: "displayName:Jane Reyes;email:jane.r@example.com;department:dept-ops;role:role-ops-staff",
    });
    pushEvent(store, { action: "MEMBER_UPDATED", module: "sales-network", entityType: "member", previousValue: "Old Name", newValue: "New Name" });
    const { items } = await auditAs(store, "dev-admin").list();
    const member = items.find((item) => item.action === "MEMBER_UPDATED")!;
    const staff = items.find((item) => item.action === AUDIT_ACTIONS.STAFF_UPDATED)!;
    expect(staff.previousValue).toBe("displayName:[changed];email:[changed];department:dept-hr;role:role-hr-staff");
    expect(staff.newValue).toBe("displayName:[changed];email:[changed];department:dept-ops;role:role-ops-staff");
    expect(member).toMatchObject({ previousValue: "[changed]", newValue: "[changed]" });
    expect(JSON.stringify(items)).not.toMatch(/Jane|jane|Old Name|New Name|example\.com/);
  });

  it("withholds user-entered reasons, exposing only reasonRecorded, and keeps system-generated reasons", async () => {
    const store = createMockStore();
    pushEvent(store, { action: "ACCREDITATION_CANCELLED", module: "accreditation", entityType: "accreditation", displayReference: "AA-0001", previousValue: "active", newValue: "cancelled", reason: "Called John Doe at 0917 000 0000" });
    pushEvent(store, { action: "SELLER_CREATED", module: "sales-network", entityType: "member", displayReference: "AA-0002", reason: "AA issued via auto; accreditation pending" });
    pushEvent(store, { action: AUDIT_ACTIONS.ACCOUNT_CREATED });
    const { items } = await auditAs(store, "dev-admin").list();
    const cancelled = items.find((item) => item.action === "ACCREDITATION_CANCELLED")!;
    const seller = items.find((item) => item.action === "SELLER_CREATED")!;
    const plain = items.find((item) => item.action === AUDIT_ACTIONS.ACCOUNT_CREATED)!;
    expect(cancelled).toMatchObject({ reason: null, reasonRecorded: true, displayReference: "AA-0001", previousValue: "active", newValue: "cancelled" });
    expect(JSON.stringify(cancelled)).not.toMatch(/John|0917/);
    expect(seller).toMatchObject({ reason: "AA issued via auto; accreditation pending", reasonRecorded: true });
    expect(plain).toMatchObject({ reason: null, reasonRecorded: false });
  });

  it("withholds values and references for actions outside the allowlist and drops unknown fields", async () => {
    const store = createMockStore();
    const event = pushEvent(store, { action: "FUTURE_ACTION", displayReference: "AA-9999", previousValue: "secret-a", newValue: "secret-b", reason: "free text" });
    (event as Record<string, unknown>).passwordHash = "should-never-appear";
    const view = (await auditAs(store, "dev-admin").list()).items.find((item) => item.action === "FUTURE_ACTION")!;
    expect(view).toMatchObject({ displayReference: null, previousValue: null, newValue: null, reason: null, reasonRecorded: true });
    expect(JSON.stringify(view)).not.toMatch(/secret|AA-9999|free text|passwordHash|should-never/);
    expect(Object.keys(view).sort()).toEqual(
      ["action", "actorId", "actorRoles", "displayReference", "entityId", "entityType", "id", "module", "newValue", "outcome", "previousValue", "reason", "reasonRecorded", "relatedRecordIds", "timestamp"],
    );
  });

  it("keeps enumerated values for status and role events", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    const account = await admin.accounts.create({ displayName: "Projection User", email: "projection@afhomes.local", roleIds: ["hr"] });
    await admin.accounts.updateStatus(account.id, "active");
    const { items } = await auditAs(store, "dev-admin").list({ entityId: account.id });
    expect(items.find((item) => item.action === AUDIT_ACTIONS.ACCOUNT_STATUS_CHANGED)).toMatchObject({ previousValue: "pending", newValue: "active" });
    expect(items.find((item) => item.action === AUDIT_ACTIONS.ACCOUNT_CREATED)?.newValue).toBe("pending [hr]");
  });
});

describe("audit read integrity", () => {
  it("returns defensive copies and never changes the store", async () => {
    const store = createMockStore();
    pushEvent(store, { action: AUDIT_ACTIONS.ACCOUNT_CREATED, actorRoles: ["admin"], relatedRecordIds: ["a"] });
    const before = JSON.stringify({ events: store.auditEvents, sequence: store.auditSequence });
    const repo = auditAs(store, "dev-admin");
    const page = await repo.list();
    const target = page.items.find((item) => item.action === AUDIT_ACTIONS.ACCOUNT_CREATED)!;
    target.actorRoles.push("super_admin");
    target.relatedRecordIds.push("tamper");
    target.newValue = "tampered";
    expect(JSON.stringify({ events: store.auditEvents, sequence: store.auditSequence })).toBe(before);
    expect((await repo.list()).items.find((item) => item.action === AUDIT_ACTIONS.ACCOUNT_CREATED)!.actorRoles).toEqual(["admin"]);
  });

  it("exposes no write operation and records nothing for rejected mutations", async () => {
    const store = createMockStore();
    const repo = auditAs(store, "dev-admin") as unknown as Record<string, unknown>;
    for (const name of ["create", "update", "delete", "append", "clear"]) expect(repo[name]).toBeUndefined();
    const hr = createMockRepositories(store, () => getDevIdentity("dev-hr"));
    await expect(hr.accounts.updateStatus("acct-admin", "suspended")).rejects.toThrow();
    expect(store.auditEvents).toHaveLength(SEED_AUDIT_EVENT_COUNT);
    expect((await auditAs(store, "dev-admin").list()).total).toBe(SEED_AUDIT_EVENT_COUNT);
  });

  it("starts from the seeded display history and leaves existing S3-C1 events untouched", async () => {
    const store = createMockStore();
    expect((await auditAs(store, "dev-super-admin").list()).items).toHaveLength(SEED_AUDIT_EVENT_COUNT);
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    await admin.accounts.create({ displayName: "History User", email: "history@afhomes.local", roleIds: ["hr"] });
    const stored = JSON.stringify(store.auditEvents);
    await auditAs(store, "dev-admin").list({ page: 1 });
    expect(JSON.stringify(store.auditEvents)).toBe(stored);
    expect(store.auditEvents).toHaveLength(1 + SEED_AUDIT_EVENT_COUNT);
  });
});

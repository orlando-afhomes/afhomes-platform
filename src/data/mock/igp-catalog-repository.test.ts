import { describe, expect, it } from "vitest";
import type { RecordIgpSale } from "@/data/contracts/igp-repository";
import { getDevIdentity } from "./dev-identities";
import { createMockRepositories } from "./repositories";
import { createMockStore } from "./seed";

function setup() {
  const store = createMockStore();
  const as = (id: string) => createMockRepositories(store, () => getDevIdentity(id));
  return { store, admin: as("dev-admin"), clerk: as("dev-clerk"), seller: as("dev-ost-a1") };
}

describe("IGP project and unit catalog", () => {
  it("lets an Administrator add, rename, deactivate, reactivate and delete, and audits each change", async () => {
    const { store, admin } = setup();
    const project = await admin.igpCatalog.createProject({ name: "  New   Towers ", location: " Sample Bay " });
    expect(project).toMatchObject({ name: "New Towers", location: "Sample Bay", status: "active", unitCount: 0, inUse: false });
    const unit = await admin.igpCatalog.createUnit({ projectId: project.id, unitOrLot: "Lot 1", propertyOwner: " Sample Owner " });
    expect(unit).toMatchObject({ unitOrLot: "Lot 1", propertyOwner: "Sample Owner", status: "active", inUse: false });
    await admin.igpCatalog.updateProject(project.id, { name: "New Towers II" });
    await admin.igpCatalog.updateProject(project.id, { status: "inactive" });
    await admin.igpCatalog.updateProject(project.id, { status: "active" });
    await admin.igpCatalog.updateUnit(unit.id, { propertyOwner: "Other Owner", status: "inactive" });
    await admin.igpCatalog.deleteUnit(unit.id);
    await admin.igpCatalog.deleteProject(project.id);
    const actions = store.auditEvents.filter(({ action }) => action.startsWith("IGP_PROJECT_") || action.startsWith("IGP_UNIT_")).map(({ action }) => action);
    expect(actions).toEqual([
      "IGP_PROJECT_CREATED", "IGP_UNIT_CREATED", "IGP_PROJECT_UPDATED", "IGP_PROJECT_DEACTIVATED", "IGP_PROJECT_REACTIVATED",
      "IGP_UNIT_UPDATED", "IGP_UNIT_DEACTIVATED", "IGP_UNIT_DELETED", "IGP_PROJECT_DELETED",
    ]);
    expect(new Set(store.auditEvents.filter(({ action }) => action.startsWith("IGP_")).map(({ entityType }) => entityType))).toEqual(new Set(["igp-project", "igp-unit"]));
    expect(JSON.stringify(store.auditEvents)).not.toMatch(/password/i);
  });

  it("validates names and keeps them unique", async () => {
    const { admin } = setup();
    await expect(admin.igpCatalog.createProject({ name: "sample heights" })).rejects.toThrow(/already exists/);
    await expect(admin.igpCatalog.createProject({ name: "   " })).rejects.toThrow(/project name/);
    await expect(admin.igpCatalog.createProject({ name: "x".repeat(81) })).rejects.toThrow(/80 characters/);
    await expect(admin.igpCatalog.createUnit({ projectId: "igp-prj-1", unitOrLot: "unit 12a", propertyOwner: "Owner" })).rejects.toThrow(/already in the project/);
    await expect(admin.igpCatalog.createUnit({ projectId: "igp-prj-2", unitOrLot: "unit 12a", propertyOwner: "Owner" })).resolves.toMatchObject({ unitOrLot: "unit 12a" });
    await expect(admin.igpCatalog.createUnit({ projectId: "igp-prj-1", unitOrLot: "Lot 77", propertyOwner: "" })).rejects.toThrow(/property owner/);
    await expect(admin.igpCatalog.createUnit({ projectId: "igp-prj-1", unitOrLot: "y".repeat(41), propertyOwner: "Owner" })).rejects.toThrow(/40 characters/);
  });

  it("blocks deleting a project or unit that a sale uses, and only managers change the catalog", async () => {
    const { store, admin, clerk, seller } = setup();
    await admin.igp.act({ type: "accredit", memberId: "mem-ost-a1", number: "JAI23010001", approvedDate: "2023-01-01" });
    store.commissionRateSettings.push({ memberId: "mem-ost-a1", product: "IGP", role: "DSC", rateBp: 500, standardRateBp: null });
    const input: RecordIgpSale = {
      customerId: "cust-a6", projectId: "igp-prj-1", unitId: "igp-unit-1", priceCentavos: 180_000_000, scheme: "T", termMonths: 12, clauses: "S", date: "2025-01-10",
      sellerMemberId: "mem-ost-a1", referrerMemberId: null, entry: "reservation",
      payment: { paidDate: "2025-01-10", method: "Cash", amountCentavos: 18_000_000, referenceNo: "IGP-0101" },
    };
    await admin.igp.act({ type: "record", input });
    const catalog = await admin.igpCatalog.list();
    expect(catalog.projects.find(({ id }) => id === "igp-prj-1")).toMatchObject({ inUse: true, unitCount: 2 });
    expect(catalog.units.find(({ id }) => id === "igp-unit-1")?.inUse).toBe(true);
    await expect(admin.igpCatalog.deleteProject("igp-prj-1")).rejects.toThrow(/Deactivate it instead/);
    await expect(admin.igpCatalog.deleteUnit("igp-unit-1")).rejects.toThrow(/Deactivate it instead/);
    await admin.igpCatalog.deleteUnit("igp-unit-2");
    await admin.igpCatalog.updateUnit("igp-unit-1", { status: "inactive" });
    await expect(clerk.igpCatalog.createProject({ name: "Clerk Project" })).rejects.toThrow(/Administrator/);
    await expect(clerk.igpCatalog.updateUnit("igp-unit-3", { status: "inactive" })).rejects.toThrow(/Administrator/);
    // Staff who enter sales read active entries only; sellers read nothing.
    const clerkView = await clerk.igpCatalog.list();
    expect(clerkView.units.map(({ id }) => id)).toEqual(["igp-unit-3", "igp-unit-4"]);
    await expect(seller.igpCatalog.list()).resolves.toEqual({ projects: [], units: [] });
  });
});

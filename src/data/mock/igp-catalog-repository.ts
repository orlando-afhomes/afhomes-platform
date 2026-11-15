import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { IgpCatalog, IgpCatalogRepository, IgpProjectView, IgpUnitView } from "@/data/contracts/igp-catalog-repository";
import type { DevIdentity } from "@/modules/identity/types";
import { cleanCatalogText, IGP_LOCATION_MAX, IGP_OWNER_MAX, IGP_PROJECT_NAME_MAX, IGP_UNIT_MAX } from "@/modules/igp/rules";
import type { IgpCatalogStatus, IgpProject, IgpUnit } from "@/modules/igp/types";
import { BusinessRepository } from "./business-base";

const DENIED = "Only an Administrator or Super Administrator can manage the IGP projects.";

function assertStatus(status: IgpCatalogStatus): void {
  if (status !== "active" && status !== "inactive") throw new Error("The status must be active or inactive.");
}

export class MockIgpCatalogRepository extends BusinessRepository implements IgpCatalogRepository {
  private projectView(project: IgpProject): IgpProjectView {
    const { sales, units } = this.store.igp;
    return { ...project, inUse: sales.some((sale) => sale.projectId === project.id), unitCount: units.filter((unit) => unit.projectId === project.id).length };
  }

  private unitView(unit: IgpUnit): IgpUnitView {
    return { ...unit, inUse: this.store.igp.sales.some((sale) => sale.unitId === unit.id) };
  }

  private manage(identity: DevIdentity) {
    this.require(identity, "igp.manage", DENIED);
  }

  private findProject(id: string): IgpProject {
    const project = this.store.igp.projects.find((item) => item.id === id);
    if (!project) throw new Error("Project not found.");
    return project;
  }

  private findUnit(id: string): IgpUnit {
    const unit = this.store.igp.units.find((item) => item.id === id);
    if (!unit) throw new Error("Unit or lot not found.");
    return unit;
  }

  private nextId(kind: "project" | "unit"): string {
    const key = kind === "project" ? "igpProject" : "igpUnit";
    const next = (this.store.counters[key] ?? 100) + 1;
    this.store.counters[key] = next;
    return `igp-${kind === "project" ? "prj" : "unit"}-${next}`;
  }

  private cleanName(raw: string, ignoreId?: string): string {
    const name = cleanCatalogText(raw, "project name", IGP_PROJECT_NAME_MAX);
    if (this.store.igp.projects.some((item) => item.id !== ignoreId && item.name.toLowerCase() === name.toLowerCase())) throw new Error("A project with this name already exists.");
    return name;
  }

  private cleanUnit(raw: string, projectId: string, ignoreId?: string): string {
    const unitOrLot = cleanCatalogText(raw, "unit or lot", IGP_UNIT_MAX);
    if (this.store.igp.units.some((item) => item.projectId === projectId && item.id !== ignoreId && item.unitOrLot.toLowerCase() === unitOrLot.toLowerCase())) {
      throw new Error("This unit or lot is already in the project.");
    }
    return unitOrLot;
  }

  private cleanLocation(raw: string | undefined): string | null {
    return raw?.trim() ? cleanCatalogText(raw, "location", IGP_LOCATION_MAX) : null;
  }

  private record(identity: DevIdentity, action: string, entityId: string, kind: "igp-project" | "igp-unit", previousValue: string | null, newValue: string | null, displayReference: string) {
    this.audit(identity, { module: "sales", entityType: kind, entityId, action, previousValue, newValue, displayReference });
  }

  async list(options?: MockAsyncOptions): Promise<IgpCatalog> {
    return this.run(options, (identity): IgpCatalog => {
      const manager = this.can(identity, "igp.manage");
      if (!manager && !this.can(identity, "igp.enter")) return { projects: [], units: [] };
      const projects = this.store.igp.projects.filter((item) => manager || item.status === "active");
      const ids = new Set(projects.map(({ id }) => id));
      return {
        projects: projects.map((item) => this.projectView(item)),
        units: this.store.igp.units.filter((item) => ids.has(item.projectId) && (manager || item.status === "active")).map((item) => this.unitView(item)),
      };
    });
  }

  async createProject(input: { name: string; location?: string }, options?: MockAsyncOptions): Promise<IgpProjectView> {
    return this.run(options, (identity) => {
      this.manage(identity);
      const project: IgpProject = { id: this.nextId("project"), name: this.cleanName(input.name), location: this.cleanLocation(input.location), status: "active" };
      this.store.igp.projects.push(project);
      this.record(identity, "IGP_PROJECT_CREATED", project.id, "igp-project", null, project.name, project.name);
      return this.projectView(project);
    });
  }

  async updateProject(id: string, input: { name?: string; location?: string; status?: IgpCatalogStatus }, options?: MockAsyncOptions): Promise<IgpProjectView> {
    return this.run(options, (identity) => {
      this.manage(identity);
      const project = this.findProject(id);
      if (input.status !== undefined) assertStatus(input.status);
      const name = input.name === undefined ? project.name : this.cleanName(input.name, id);
      const location = input.location === undefined ? project.location : this.cleanLocation(input.location);
      const status = input.status ?? project.status;
      if (name !== project.name) this.record(identity, "IGP_PROJECT_UPDATED", id, "igp-project", `name:${project.name}`, `name:${name}`, name);
      if (location !== project.location) this.record(identity, "IGP_PROJECT_UPDATED", id, "igp-project", `location:${project.location ?? ""}`, `location:${location ?? ""}`, name);
      if (status !== project.status) this.record(identity, status === "inactive" ? "IGP_PROJECT_DEACTIVATED" : "IGP_PROJECT_REACTIVATED", id, "igp-project", project.status, status, name);
      Object.assign(project, { name, location, status });
      return this.projectView(project);
    });
  }

  async deleteProject(id: string, options?: MockAsyncOptions): Promise<void> {
    return this.run(options, (identity) => {
      this.manage(identity);
      const project = this.findProject(id);
      if (this.projectView(project).inUse) throw new Error(`"${project.name}" is used by existing sales. Deactivate it instead.`);
      this.store.igp.projects.splice(this.store.igp.projects.indexOf(project), 1);
      this.store.igp.units = this.store.igp.units.filter((unit) => unit.projectId !== id);
      this.record(identity, "IGP_PROJECT_DELETED", id, "igp-project", project.name, null, project.name);
    });
  }

  async createUnit(input: { projectId: string; unitOrLot: string; propertyOwner: string }, options?: MockAsyncOptions): Promise<IgpUnitView> {
    return this.run(options, (identity) => {
      this.manage(identity);
      const project = this.findProject(input.projectId);
      const unit: IgpUnit = {
        id: this.nextId("unit"), projectId: project.id, unitOrLot: this.cleanUnit(input.unitOrLot, project.id),
        propertyOwner: cleanCatalogText(input.propertyOwner, "property owner", IGP_OWNER_MAX), status: "active",
      };
      this.store.igp.units.push(unit);
      this.record(identity, "IGP_UNIT_CREATED", unit.id, "igp-unit", null, `${project.name} / ${unit.unitOrLot}`, unit.unitOrLot);
      return this.unitView(unit);
    });
  }

  async updateUnit(id: string, input: { unitOrLot?: string; propertyOwner?: string; status?: IgpCatalogStatus }, options?: MockAsyncOptions): Promise<IgpUnitView> {
    return this.run(options, (identity) => {
      this.manage(identity);
      const unit = this.findUnit(id);
      if (input.status !== undefined) assertStatus(input.status);
      const unitOrLot = input.unitOrLot === undefined ? unit.unitOrLot : this.cleanUnit(input.unitOrLot, unit.projectId, id);
      const propertyOwner = input.propertyOwner === undefined ? unit.propertyOwner : cleanCatalogText(input.propertyOwner, "property owner", IGP_OWNER_MAX);
      const status = input.status ?? unit.status;
      if (unitOrLot !== unit.unitOrLot) this.record(identity, "IGP_UNIT_UPDATED", id, "igp-unit", `unit:${unit.unitOrLot}`, `unit:${unitOrLot}`, unitOrLot);
      if (propertyOwner !== unit.propertyOwner) this.record(identity, "IGP_UNIT_UPDATED", id, "igp-unit", `owner:${unit.propertyOwner}`, `owner:${propertyOwner}`, unitOrLot);
      if (status !== unit.status) this.record(identity, status === "inactive" ? "IGP_UNIT_DEACTIVATED" : "IGP_UNIT_REACTIVATED", id, "igp-unit", unit.status, status, unitOrLot);
      Object.assign(unit, { unitOrLot, propertyOwner, status });
      return this.unitView(unit);
    });
  }

  async deleteUnit(id: string, options?: MockAsyncOptions): Promise<void> {
    return this.run(options, (identity) => {
      this.manage(identity);
      const unit = this.findUnit(id);
      if (this.unitView(unit).inUse) throw new Error(`"${unit.unitOrLot}" is used by existing sales. Deactivate it instead.`);
      this.store.igp.units.splice(this.store.igp.units.indexOf(unit), 1);
      this.record(identity, "IGP_UNIT_DELETED", id, "igp-unit", unit.unitOrLot, null, unit.unitOrLot);
    });
  }
}

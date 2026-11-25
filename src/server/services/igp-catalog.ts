import "server-only";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { IgpCatalogStatus } from "@/modules/igp/types";
import { cleanCatalogText, IGP_LOCATION_MAX, IGP_OWNER_MAX, IGP_PROJECT_NAME_MAX, IGP_UNIT_MAX } from "@/modules/igp/rules";
import type { Actor } from "@/server/auth/actor";
import { requireOperation } from "@/server/auth/authorize";
import { listAll } from "@/server/db";
import { conflict, invalid, newId, notFound, transact } from "@/server/services/common";

/** Property projects and units (IGP). Sales copy the names at entry, so later edits never change a sale. */

type ProjectRow = { id: string; name: string; location: string | null; status: string };
type UnitRow = { id: string; project: { id: string } | null; unitOrLot: string; propertyOwner: string; status: string };

const PROJECT_FIELDS = "id name location status";
const UNIT_FIELDS = "id project { id } unitOrLot propertyOwner status";

async function projectRows(): Promise<ProjectRow[]> {
  return listAll<ProjectRow>("igpProjects", PROJECT_FIELDS);
}

async function unitRows(): Promise<UnitRow[]> {
  return listAll<UnitRow>("igpUnits", UNIT_FIELDS);
}

async function usedProjectIds(): Promise<Set<string>> {
  const rows = await listAll<{ project: { id: string } | null }>("igpSales", "project { id }");
  return new Set(rows.map((row) => row.project?.id).filter((id): id is string => Boolean(id)));
}

async function usedUnitIds(): Promise<Set<string>> {
  const rows = await listAll<{ unit: { id: string } | null }>("igpSales", "unit { id }");
  return new Set(rows.map((row) => row.unit?.id).filter((id): id is string => Boolean(id)));
}

function clean(raw: string, label: string, max: number): string {
  try {
    return cleanCatalogText(raw, label, max);
  } catch (error) {
    throw invalid(error instanceof Error ? error.message : `Enter the ${label}.`);
  }
}

function assertStatus(status: IgpCatalogStatus): void {
  if (status !== "active" && status !== "inactive") throw invalid("The status must be active or inactive.");
}

export async function createIgpProject(actor: Actor, input: { name: string; location?: string }) {
  requireOperation(actor, "igp.manage");
  const projects = await projectRows();
  const name = clean(input.name, "project name", IGP_PROJECT_NAME_MAX);
  if (projects.some((project) => project.name.toLowerCase() === name.toLowerCase())) throw conflict("project_exists", "A project with this name already exists.");
  const location = input.location?.trim() ? clean(input.location, "location", IGP_LOCATION_MAX) : null;
  const id = newId();
  await transact(actor, {
    variableDefinitions: "$d: IgpProject_Data!",
    fields: "project: igpProject_insert(data: $d)",
    variables: { d: { id, name, location: location ?? null, status: "active" } },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.IGP_PROJECT_CREATED, entityType: "igp-project", entityId: id, details: { module: "sales", newValue: name, displayReference: name } }],
  });
  return { id, name, location, status: "active" as const, inUse: false, unitCount: 0 };
}

export async function updateIgpProject(actor: Actor, id: string, input: { name?: string; location?: string; status?: IgpCatalogStatus }) {
  requireOperation(actor, "igp.manage");
  const project = (await projectRows()).find((item) => item.id === id);
  if (!project) throw notFound("Project");
  if (input.status !== undefined) assertStatus(input.status);
  const name = input.name === undefined ? project.name : clean(input.name, "project name", IGP_PROJECT_NAME_MAX);
  if (input.name !== undefined && (await projectRows()).some((item) => item.id !== id && item.name.toLowerCase() === name.toLowerCase())) throw conflict("project_exists", "A project with this name already exists.");
  const location = input.location === undefined ? project.location : input.location.trim() ? clean(input.location, "location", IGP_LOCATION_MAX) : null;
  const status = input.status ?? (project.status === "active" ? "active" : "inactive");
  const audits = [
    ...(name !== project.name ? [{ action: BUSINESS_AUDIT_ACTIONS.IGP_PROJECT_UPDATED, entityType: "igp-project", entityId: id, details: { module: "sales", previousValue: `name:${project.name}`, newValue: `name:${name}`, displayReference: name } }] : []),
    ...(location !== project.location ? [{ action: BUSINESS_AUDIT_ACTIONS.IGP_PROJECT_UPDATED, entityType: "igp-project", entityId: id, details: { module: "sales", previousValue: `location:${project.location ?? ""}`, newValue: `location:${location ?? ""}`, displayReference: name } }] : []),
    ...(status !== project.status ? [{ action: status === "inactive" ? BUSINESS_AUDIT_ACTIONS.IGP_PROJECT_DEACTIVATED : BUSINESS_AUDIT_ACTIONS.IGP_PROJECT_REACTIVATED, entityType: "igp-project", entityId: id, details: { module: "sales", previousValue: project.status, newValue: status, displayReference: name } }] : []),
  ];
  if (audits.length > 0) {
    await transact(actor, {
      variableDefinitions: "$id: UUID!, $d: IgpProject_Data!",
      fields: "project: igpProject_update(id: $id, data: $d)",
      variables: { id, d: { name, location: location ?? null, status } },
      audit: audits,
    });
  }
  const [used, units] = await Promise.all([usedProjectIds(), unitRows()]);
  return { id, name, location, status: status as IgpCatalogStatus, inUse: used.has(id), unitCount: units.filter((unit) => unit.project?.id === id).length };
}

export async function deleteIgpProject(actor: Actor, id: string): Promise<void> {
  requireOperation(actor, "igp.manage");
  const project = (await projectRows()).find((item) => item.id === id);
  if (!project) throw notFound("Project");
  if ((await usedProjectIds()).has(id)) throw conflict("project_in_use", `"${project.name}" is used by existing sales. Deactivate it instead.`);
  const units = (await unitRows()).filter((unit) => unit.project?.id === id);
  const unitAudits = units.map((unit) => ({ action: BUSINESS_AUDIT_ACTIONS.IGP_UNIT_DELETED, entityType: "igp-unit", entityId: unit.id, details: { module: "sales", previousValue: unit.unitOrLot, displayReference: unit.unitOrLot } }));
  await transact(actor, {
    variableDefinitions: ["$id: UUID!", ...units.map((_, index) => `$u${index}: UUID!`)].join(", "),
    fields: [...units.map((_, index) => `unit${index}: igpUnit_delete(id: $u${index})`), "project: igpProject_delete(id: $id)"].join("\n"),
    variables: { id, ...Object.fromEntries(units.map((unit, index) => [`u${index}`, unit.id])) },
    audit: [...unitAudits, { action: BUSINESS_AUDIT_ACTIONS.IGP_PROJECT_DELETED, entityType: "igp-project", entityId: id, details: { module: "sales", previousValue: project.name, displayReference: project.name, relatedRecordIds: units.map((unit) => unit.id) } }],
  });
}

export async function createIgpUnit(actor: Actor, input: { projectId: string; unitOrLot: string; propertyOwner: string }) {
  requireOperation(actor, "igp.manage");
  const project = (await projectRows()).find((item) => item.id === input.projectId);
  if (!project) throw invalid("Choose a project.");
  const unitOrLot = clean(input.unitOrLot, "unit or lot", IGP_UNIT_MAX);
  const units = await unitRows();
  if (units.some((unit) => unit.project?.id === input.projectId && unit.unitOrLot.toLowerCase() === unitOrLot.toLowerCase())) throw conflict("unit_exists", "This unit or lot is already in the project.");
  const propertyOwner = clean(input.propertyOwner, "property owner", IGP_OWNER_MAX);
  const id = newId();
  await transact(actor, {
    variableDefinitions: "$d: IgpUnit_Data!",
    fields: "unit: igpUnit_insert(data: $d)",
    variables: { d: { id, projectId: project.id, unitOrLot, propertyOwner, status: "active" } },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.IGP_UNIT_CREATED, entityType: "igp-unit", entityId: id, details: { module: "sales", newValue: `${project.name} / ${unitOrLot}`, displayReference: unitOrLot } }],
  });
  return { id, projectId: project.id, unitOrLot, propertyOwner, status: "active" as const, inUse: false };
}

export async function updateIgpUnit(actor: Actor, id: string, input: { unitOrLot?: string; propertyOwner?: string; status?: IgpCatalogStatus }) {
  requireOperation(actor, "igp.manage");
  const unit = (await unitRows()).find((item) => item.id === id);
  if (!unit) throw notFound("Unit or lot");
  if (input.status !== undefined) assertStatus(input.status);
  const unitOrLot = input.unitOrLot === undefined ? unit.unitOrLot : clean(input.unitOrLot, "unit or lot", IGP_UNIT_MAX);
  if (input.unitOrLot !== undefined && (await unitRows()).some((item) => item.id !== id && item.project?.id === unit.project?.id && item.unitOrLot.toLowerCase() === unitOrLot.toLowerCase())) throw conflict("unit_exists", "This unit or lot is already in the project.");
  const propertyOwner = input.propertyOwner === undefined ? unit.propertyOwner : clean(input.propertyOwner, "property owner", IGP_OWNER_MAX);
  const status = input.status ?? (unit.status === "active" ? "active" : "inactive");
  const audits = [
    ...(unitOrLot !== unit.unitOrLot ? [{ action: BUSINESS_AUDIT_ACTIONS.IGP_UNIT_UPDATED, entityType: "igp-unit", entityId: id, details: { module: "sales", previousValue: `unit:${unit.unitOrLot}`, newValue: `unit:${unitOrLot}`, displayReference: unitOrLot } }] : []),
    ...(propertyOwner !== unit.propertyOwner ? [{ action: BUSINESS_AUDIT_ACTIONS.IGP_UNIT_UPDATED, entityType: "igp-unit", entityId: id, details: { module: "sales", previousValue: `owner:${unit.propertyOwner}`, newValue: `owner:${propertyOwner}`, displayReference: unitOrLot } }] : []),
    ...(status !== unit.status ? [{ action: status === "inactive" ? BUSINESS_AUDIT_ACTIONS.IGP_UNIT_DEACTIVATED : BUSINESS_AUDIT_ACTIONS.IGP_UNIT_REACTIVATED, entityType: "igp-unit", entityId: id, details: { module: "sales", previousValue: unit.status, newValue: status, displayReference: unitOrLot } }] : []),
  ];
  if (audits.length > 0) {
    await transact(actor, {
      variableDefinitions: "$id: UUID!, $d: IgpUnit_Data!",
      fields: "unit: igpUnit_update(id: $id, data: $d)",
      variables: { id, d: { unitOrLot, propertyOwner, status } },
      audit: audits,
    });
  }
  return { id, projectId: unit.project?.id ?? "", unitOrLot, propertyOwner, status: status as IgpCatalogStatus, inUse: (await usedUnitIds()).has(id) };
}

export async function deleteIgpUnit(actor: Actor, id: string): Promise<void> {
  requireOperation(actor, "igp.manage");
  const unit = (await unitRows()).find((item) => item.id === id);
  if (!unit) throw notFound("Unit or lot");
  if ((await usedUnitIds()).has(id)) throw conflict("unit_in_use", `"${unit.unitOrLot}" is used by existing sales. Deactivate it instead.`);
  await transact(actor, {
    variableDefinitions: "$id: UUID!",
    fields: "unit: igpUnit_delete(id: $id)",
    variables: { id },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.IGP_UNIT_DELETED, entityType: "igp-unit", entityId: id, details: { module: "sales", previousValue: unit.unitOrLot, displayReference: unit.unitOrLot } }],
  });
}

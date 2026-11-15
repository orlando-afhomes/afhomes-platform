import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { IgpCatalogStatus, IgpProject, IgpUnit } from "@/modules/igp/types";

/** `inUse`: a sale already references it, so it can only be deactivated, not deleted. */
export type IgpUnitView = IgpUnit & { inUse: boolean };
export type IgpProjectView = IgpProject & { inUse: boolean; unitCount: number };
export type IgpCatalog = { projects: IgpProjectView[]; units: IgpUnitView[] };

export interface IgpCatalogRepository {
  /** Managers see everything; staff who enter sales see only active projects and units. */
  list(options?: MockAsyncOptions): Promise<IgpCatalog>;
  createProject(input: { name: string; location?: string }, options?: MockAsyncOptions): Promise<IgpProjectView>;
  updateProject(id: string, input: { name?: string; location?: string; status?: IgpCatalogStatus }, options?: MockAsyncOptions): Promise<IgpProjectView>;
  /** Throws with the reason when a sale uses the project. Removes its (unused) units too. */
  deleteProject(id: string, options?: MockAsyncOptions): Promise<void>;
  createUnit(input: { projectId: string; unitOrLot: string; propertyOwner: string }, options?: MockAsyncOptions): Promise<IgpUnitView>;
  updateUnit(id: string, input: { unitOrLot?: string; propertyOwner?: string; status?: IgpCatalogStatus }, options?: MockAsyncOptions): Promise<IgpUnitView>;
  deleteUnit(id: string, options?: MockAsyncOptions): Promise<void>;
}

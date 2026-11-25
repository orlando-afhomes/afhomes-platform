import "server-only";
import type { Experience, ExperienceHighlight, ExperienceStatusTone } from "@/modules/experiences/types";
import type { Outlet, OutletType, ReferenceEntry, ReferenceListId } from "@/modules/settings/lists";
import type { SiteImage } from "@/modules/public-site/content/experiences";
import { listAll } from "@/server/db";

/** Confirmed site content and lists read from the database (F0). */

type ExperienceRow = {
  key: string; slug: string; title: string; category: string; summary: string; status: string; statusTone: string;
  image: SiteImage | null; overview: string; highlights: ExperienceHighlight[] | null; standard: boolean; published: boolean;
  createdAt: string; updatedAt: string;
};
type OutletRow = { key: string; name: string; type: string; status: string; sample: boolean };
type ReferenceEntryRow = { key: string; list: string; value: string; label: string; status: string; sortOrder: number };
export type PrintTemplateView = { key: string; name: string; kind: string; revision: string; assetPath: string | null; status: string };

const EXPERIENCE_FIELDS = "key slug title category summary status statusTone image overview highlights standard published createdAt updatedAt";
const OUTLET_FIELDS = "key name type status sample";
const REFERENCE_FIELDS = "key list value label status sortOrder";
const PRINT_TEMPLATE_FIELDS = "key name kind revision assetPath status sortOrder";

export async function loadExperiences(): Promise<Experience[]> {
  const rows = await listAll<ExperienceRow>("experiences", EXPERIENCE_FIELDS);
  return rows
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((row) => ({
      id: row.key,
      slug: row.slug,
      title: row.title,
      category: row.category,
      summary: row.summary,
      status: row.status,
      statusTone: row.statusTone as ExperienceStatusTone,
      image: row.image ?? ({ src: "", alt: row.title } as SiteImage),
      overview: row.overview,
      highlights: row.highlights ?? [],
      standard: row.standard,
      published: row.published,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
}

export async function loadOutlets(): Promise<Outlet[]> {
  const rows = await listAll<OutletRow>("outlets", OUTLET_FIELDS);
  return rows
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((row) => ({ id: row.key, name: row.name, type: row.type as OutletType, status: row.status === "active" ? "active" : "inactive", sample: row.sample }));
}

export async function loadPrintTemplates(): Promise<PrintTemplateView[]> {
  const rows = await listAll<PrintTemplateView & { sortOrder: number }>("printTemplates", PRINT_TEMPLATE_FIELDS);
  return rows
    .sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key))
    .map((row) => ({ key: row.key, name: row.name, kind: row.kind, revision: row.revision, assetPath: row.assetPath, status: row.status }));
}

export async function loadReferenceEntries(): Promise<ReferenceEntry[]> {
  const rows = await listAll<ReferenceEntryRow>("referenceEntries", REFERENCE_FIELDS);
  return rows
    .sort((a, b) => a.list.localeCompare(b.list) || a.sortOrder - b.sortOrder)
    .map((row) => ({
      id: row.key,
      list: row.list as ReferenceListId,
      value: row.value,
      label: row.label,
      status: row.status === "active" ? "active" : "inactive",
      sortOrder: row.sortOrder,
    }));
}

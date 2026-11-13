import { GOV_ID_OPTIONS, PROGRAM_CATEGORY_OPTIONS } from "@/modules/sales-network/accredited-seller";

/** Admin-managed lists (Settings, Lists). Other fixed lists stay in code because approved rules define them. */
export type ReferenceListId = "program-category" | "gov-id-type" | "bank";
export type ListEntryStatus = "active" | "inactive";

export const REFERENCE_LISTS: ReadonlyArray<{ id: ReferenceListId; label: string; singular: string }> = [
  { id: "program-category", label: "Program categories", singular: "program category" },
  { id: "gov-id-type", label: "Government ID types", singular: "government ID type" },
  { id: "bank", label: "Banks", singular: "bank" },
];

/** `value` is the stable key stored on records; it never changes after creation. */
export type ReferenceEntry = {
  id: string;
  list: ReferenceListId;
  value: string;
  label: string;
  status: ListEntryStatus;
  sortOrder: number;
};

export type OutletType = "accommodation" | "restaurant" | "spa" | "shop" | "other";
export const OUTLET_TYPES: ReadonlyArray<{ value: OutletType; label: string }> = [
  { value: "accommodation", label: "Accommodation" },
  { value: "restaurant", label: "Restaurant" },
  { value: "spa", label: "Spa" },
  { value: "shop", label: "Shop" },
  { value: "other", label: "Other" },
];

export type Outlet = {
  id: string;
  name: string;
  type: OutletType;
  status: ListEntryStatus;
  /** Marked sample data, replaced when the owner supplies the real outlets. */
  sample: boolean;
};

/** Seed lists keep today's stable values so existing records still resolve. */
export function seedReferenceEntries(): ReferenceEntry[] {
  const programs: ReferenceEntry[] = PROGRAM_CATEGORY_OPTIONS.map((option, index) => ({
    id: `ref-program-category-${index + 1}`, list: "program-category", value: option.value, label: option.label, status: "active", sortOrder: index + 1,
  }));
  const govIds: ReferenceEntry[] = GOV_ID_OPTIONS.map((option, index) => ({
    id: `ref-gov-id-type-${index + 1}`, list: "gov-id-type", value: option.value, label: option.label, status: "active", sortOrder: index + 1,
  }));
  const banks: ReferenceEntry[] = ["BDO Unibank", "Bank of the Philippine Islands", "Metrobank", "Landbank of the Philippines", "Security Bank", "UnionBank of the Philippines"].map((label, index) => ({
    id: `ref-bank-${index + 1}`, list: "bank", value: slugify(label), label, status: "active", sortOrder: index + 1,
  }));
  return [...programs, ...govIds, ...banks];
}

/** The two overnight venues keep their ids so seeded bills and bookings stay valid; the rest are samples. */
export function seedOutlets(): Outlet[] {
  return [
    { id: "venue-wellness-hotel", name: "AFhomes Smart Wellness Hotel", type: "accommodation", status: "active", sample: false },
    { id: "venue-hotspring-resort", name: "AFhomes Hotspring & Ecofarm Resort", type: "accommodation", status: "active", sample: false },
    { id: "outlet-teppanyaki", name: "Teppanyaki Restaurant", type: "restaurant", status: "active", sample: true },
    { id: "outlet-spa", name: "Resort Spa", type: "spa", status: "active", sample: true },
    { id: "outlet-shop", name: "Souvenir Shop", type: "shop", status: "active", sample: true },
  ];
}

export function slugify(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

type Option = { value: string; label: string };

/**
 * Options for a select: active entries in order, plus any inactive entry whose
 * value is already saved on the record being edited (`keep`).
 */
export function listOptions(entries: readonly ReferenceEntry[], list: ReferenceListId, keep: readonly (string | null | undefined)[] = []): Option[] {
  return entries
    .filter((entry) => entry.list === list && (entry.status === "active" || keep.includes(entry.value)))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((entry) => ({ value: entry.value, label: entry.status === "active" ? entry.label : `${entry.label} (inactive)` }));
}

/** Values a record may be saved with: active entries plus the value it already holds. */
export function allowedValues(entries: readonly ReferenceEntry[], list: ReferenceListId, keep: readonly (string | null | undefined)[] = []): string[] {
  return listOptions(entries, list, keep).map((option) => option.value);
}

/**
 * Philippine location reference for dependent address selects.
 *
 * SOURCE: full Philippine Standard Geographic Code (PSGC) snapshot, generated
 * from the PSA PSGC mirror at https://psgc.gitlab.io/ by
 * `scripts/generate-psgc.mjs` into `./psgc-data.generated.ts`. Coverage is the
 * complete PSGC province / city-municipality / barangay set (names only); the
 * previous small curated lists are no longer the source of truth. Independent
 * and highly-urbanized cities with no province are grouped under a PSGC
 * region-based pseudo-province (NCR is labelled "Metro Manila"; SOCCSKSARGEN
 * and Zamboanga Peninsula hold Cotabato City and Isabela City respectively).
 *
 * NAMES + LOOKUPS:
 * - Values stay plain NAMES (AddressValue stores names, never codes).
 * - Every lookup is case-insensitive and trimmed. Diacritics are ignored, so
 *   "Paranaque" still finds "Parañaque".
 * - PSGC publishes most cities as "City of X"; the helpers display those as
 *   "X City" (e.g. "City of Lapu-Lapu" -> "Lapu-Lapu City") and accept BOTH
 *   spellings, plus the legacy bare Metro Manila names ("Manila", "Makati",
 *   "Marikina") and "NCR"/"National Capital Region" for "Metro Manila".
 *   Existing stored address values therefore keep resolving.
 * - Barangay names are PSGC spellings (e.g. "Poblacion No. 1"); no aliases.
 *
 * ZIP / AREA CODE OVERLAY:
 * - PSGC itself has no ZIP codes or landline area codes. ZIPs come from three
 *   layers, highest precedence first: the small curated `POSTAL_OVERLAY` below,
 *   `CITY_PRINCIPAL_ZIPS` in the generated module (the most common barangay ZIP
 *   of each municipality, 1,634 of 1,634 cities), and the older city-level
 *   `CITY_ZIPS` enrichment. The overlay is authoritative for the cities it
 *   lists (e.g. Marikina 1807 rather than the source's 1800).
 * - A `null` postal value in the overlay means "no opinion": the lookup falls
 *   through to the generated layers instead of suppressing a value. A null
 *   postal lookup only happens for unknown cities; callers must still never
 *   overwrite a user-typed ZIP with null.
 * - `CITY_PRINCIPAL_ZIPS` is a municipality-level default, not a barangay-level
 *   code. Cities that PHLPost splits into several ZIPs (most of Metro Manila)
 *   therefore return the municipality's principal ZIP; the field stays
 *   editable, and the user remains responsible for the exact district code.
 * - Landline area codes come from the curated overlay first, then from
 *   `PROVINCE_AREA_CODES`: the standard PHLPost/PLDT provincial codes, with
 *   Metro Manila 02 and the independent-city pseudo-provinces included.
 *
 * Doc-04 section 7.4 compliance note: address locality fields MUST render as
 * dependent selects (province -> city/municipality -> barangay) with ZIP
 * auto-fill from the resolved principal ZIP. ZIP stays an editable text input
 * afterwards; a null postal lookup must never overwrite a user-typed ZIP.
 */

import {
  CITY_PRINCIPAL_ZIPS,
  CITY_ZIPS,
  PSGC_BARANGAYS,
  PSGC_CITIES,
  PSGC_PROVINCES,
} from "./psgc-data.generated";

export type PHCity = {
  name: string;
  barangays: string[];
  /** Resolved ZIP: curated value, else the municipality's principal ZIP. */
  postalCode: string | null;
  /** Landline area code from the curated overlay or the province table. */
  areaCode: string | null;
};

export type PHProvince = {
  name: string;
  cities: PHCity[];
};

type PostalOverlay = {
  province: string;
  city: string;
  postalCode: string | null;
  areaCode: string | null;
};

/**
 * Curated ZIP / landline area code overlay. Keyed by the PSGC province and
 * city NAMES (aliases accepted). A `postalCode: null` means "no opinion": the
 * generated principal/city ZIP layers are used instead. Use an explicit value
 * only when the curated code must beat the generated layers.
 */
const POSTAL_OVERLAY: ReadonlyArray<PostalOverlay> = [
  // Metro Manila (area code 02). The generated principal ZIPs are used; the
  // overlay only pins the cities whose code must differ from the default.
  { province: "Metro Manila", city: "Caloocan City", postalCode: null, areaCode: "02" },
  { province: "Metro Manila", city: "Las Piñas City", postalCode: null, areaCode: "02" },
  { province: "Metro Manila", city: "Makati City", postalCode: null, areaCode: "02" },
  { province: "Metro Manila", city: "Malabon City", postalCode: null, areaCode: "02" },
  { province: "Metro Manila", city: "Mandaluyong City", postalCode: null, areaCode: "02" },
  { province: "Metro Manila", city: "Manila City", postalCode: null, areaCode: "02" },
  { province: "Metro Manila", city: "Marikina City", postalCode: "1807", areaCode: "02" },
  { province: "Metro Manila", city: "Muntinlupa City", postalCode: null, areaCode: "02" },
  { province: "Metro Manila", city: "Navotas City", postalCode: null, areaCode: "02" },
  { province: "Metro Manila", city: "Parañaque City", postalCode: null, areaCode: "02" },
  { province: "Metro Manila", city: "Pasay City", postalCode: null, areaCode: "02" },
  { province: "Metro Manila", city: "Pasig City", postalCode: null, areaCode: "02" },
  { province: "Metro Manila", city: "Pateros", postalCode: null, areaCode: "02" },
  { province: "Metro Manila", city: "Quezon City", postalCode: null, areaCode: "02" },
  { province: "Metro Manila", city: "San Juan City", postalCode: null, areaCode: "02" },
  { province: "Metro Manila", city: "Taguig City", postalCode: null, areaCode: "02" },
  { province: "Metro Manila", city: "Valenzuela City", postalCode: null, areaCode: "02" },
  // Cebu.
  { province: "Cebu", city: "Cebu City", postalCode: "6000", areaCode: "032" },
  { province: "Cebu", city: "Lapu-Lapu City", postalCode: "6015", areaCode: "032" },
  { province: "Cebu", city: "Mandaue City", postalCode: "6014", areaCode: "032" },
  { province: "Cebu", city: "Talisay City", postalCode: "6045", areaCode: "032" },
  // Negros Oriental / Negros Occidental.
  { province: "Negros Oriental", city: "Dumaguete City", postalCode: "6200", areaCode: "035" },
  { province: "Negros Occidental", city: "Bacolod City", postalCode: "6100", areaCode: "034" },
  // Batangas.
  { province: "Batangas", city: "Batangas City", postalCode: "4200", areaCode: "043" },
  { province: "Batangas", city: "Lipa City", postalCode: "4217", areaCode: "043" },
  { province: "Batangas", city: "Tanauan City", postalCode: "4232", areaCode: "043" },
  // Davao region.
  { province: "Davao Del Sur", city: "Davao City", postalCode: "8000", areaCode: "082" },
  { province: "Davao Del Sur", city: "Digos City", postalCode: "8002", areaCode: "082" },
  // CALABARZON.
  { province: "Laguna", city: "Santa Rosa City", postalCode: "4026", areaCode: "049" },
  { province: "Laguna", city: "Calamba City", postalCode: null, areaCode: "049" },
  { province: "Cavite", city: "Bacoor City", postalCode: "4102", areaCode: "046" },
  { province: "Rizal", city: "Antipolo City", postalCode: "1870", areaCode: "02" },
  // Pampanga.
  { province: "Pampanga", city: "Angeles City", postalCode: "2009", areaCode: "045" },
  // Other major cities with confident, single-code mappings.
  { province: "Benguet", city: "Baguio City", postalCode: "2600", areaCode: "074" },
  { province: "Iloilo", city: "Iloilo City", postalCode: "5000", areaCode: "033" },
  { province: "Misamis Oriental", city: "Cagayan de Oro City", postalCode: "9000", areaCode: "088" },
  { province: "South Cotabato", city: "General Santos City", postalCode: "9500", areaCode: "083" },
  { province: "Zamboanga Del Sur", city: "Zamboanga City", postalCode: "7000", areaCode: "062" },
  { province: "Palawan", city: "Puerto Princesa City", postalCode: "5300", areaCode: "048" },
  { province: "Leyte", city: "Tacloban City", postalCode: "6500", areaCode: "053" },
  { province: "Albay", city: "Legazpi City", postalCode: "4500", areaCode: "052" },
  { province: "Camarines Sur", city: "Naga City", postalCode: "4400", areaCode: "054" },
  { province: "Agusan Del Norte", city: "Butuan City", postalCode: "8600", areaCode: "085" },
  { province: "Lanao Del Norte", city: "Iligan City", postalCode: "9200", areaCode: "063" },
  { province: "SOCCSKSARGEN", city: "Cotabato City", postalCode: "9600", areaCode: "064" },
  { province: "Bohol", city: "Tagbilaran City", postalCode: "6300", areaCode: "038" },
  { province: "Quezon", city: "Lucena City", postalCode: "4301", areaCode: "042" },
  { province: "Zambales", city: "Olongapo City", postalCode: "2200", areaCode: "047" },
  { province: "Pangasinan", city: "Dagupan City", postalCode: "2400", areaCode: "075" },
];

/**
 * Legacy province names that are no longer PSGC provinces. Values are the
 * generated province keys. Case/diacritic-insensitive.
 */
const PROVINCE_ALIASES: Readonly<Record<string, string>> = {
  ncr: "Metro Manila",
  "national capital region": "Metro Manila",
  "davao city": "Davao Del Sur",
};

/**
 * Legacy city names (the old curated Metro Manila list used bare names).
 * Values are the display names produced from PSGC. Case/diacritic-insensitive.
 */
const CITY_ALIASES: Readonly<Record<string, string>> = {
  caloocan: "Caloocan City",
  "las piñas": "Las Piñas City",
  makati: "Makati City",
  malabon: "Malabon City",
  mandaluyong: "Mandaluyong City",
  manila: "Manila City",
  marikina: "Marikina City",
  muntinlupa: "Muntinlupa City",
  navotas: "Navotas City",
  parañaque: "Parañaque City",
  pasay: "Pasay City",
  pasig: "Pasig City",
  pateros: "Pateros",
  "quezon city": "Quezon City",
  "san juan": "San Juan City",
  taguig: "Taguig City",
  valenzuela: "Valenzuela City",
};

const CITY_OF_PREFIX = "City of ";

/**
 * Standard fixed-line area codes per province / pseudo-province. Sources:
 * PHLPost/PLDT provincial area codes and the NTC area-code grouping (Area 2
 * Metro Manila/Rizal, Area 3 Visayas, Area 4 Central Luzon/Southern Tagalog,
 * Area 5 Bicol/Eastern Visayas, Area 6 Western/Central Mindanao, Area 7
 * Northern Luzon, Area 8 Davao/Caraga/Southern SOCCSKSARGEN). Keys are the
 * generated province names, including "Metro Manila", "SOCCSKSARGEN" (Cotabato
 * City) and "Zamboanga Peninsula" (Isabela City). Apayao uses 078: the
 * province's exchanges are part of the Cagayan Valley network even though the
 * rest of the Cordillera uses 074. Lookup is case-insensitive.
 */
export const PROVINCE_AREA_CODES: Record<string, string> = {
  Abra: "074",
  "Agusan Del Norte": "085",
  "Agusan Del Sur": "085",
  Aklan: "036",
  Albay: "052",
  Antique: "036",
  Apayao: "078",
  Aurora: "042",
  Basilan: "062",
  Bataan: "047",
  Batanes: "078",
  Batangas: "043",
  Benguet: "074",
  Biliran: "053",
  Bohol: "038",
  Bukidnon: "088",
  Bulacan: "044",
  Cagayan: "078",
  "Camarines Norte": "054",
  "Camarines Sur": "054",
  Camiguin: "088",
  Capiz: "036",
  Catanduanes: "052",
  Cavite: "046",
  Cebu: "032",
  Cotabato: "064",
  "Davao De Oro": "087",
  "Davao Del Norte": "084",
  "Davao Del Sur": "082",
  "Davao Occidental": "082",
  "Davao Oriental": "087",
  "Dinagat Islands": "086",
  "Eastern Samar": "055",
  Guimaras: "033",
  Ifugao: "074",
  "Ilocos Norte": "077",
  "Ilocos Sur": "077",
  Iloilo: "033",
  Isabela: "078",
  Kalinga: "074",
  "La Union": "072",
  Laguna: "049",
  "Lanao Del Norte": "063",
  "Lanao Del Sur": "063",
  Leyte: "053",
  Maguindanao: "064",
  Marinduque: "042",
  Masbate: "056",
  "Metro Manila": "02",
  "Misamis Occidental": "088",
  "Misamis Oriental": "088",
  "Mountain Province": "074",
  "Negros Occidental": "034",
  "Negros Oriental": "035",
  "Northern Samar": "055",
  "Nueva Ecija": "044",
  "Nueva Vizcaya": "078",
  "Occidental Mindoro": "043",
  "Oriental Mindoro": "043",
  Palawan: "048",
  Pampanga: "045",
  Pangasinan: "075",
  Quezon: "042",
  Quirino: "078",
  Rizal: "02",
  Romblon: "042",
  Samar: "055",
  Sarangani: "083",
  Siquijor: "035",
  SOCCSKSARGEN: "064",
  Sorsogon: "056",
  "South Cotabato": "083",
  "Southern Leyte": "053",
  "Sultan Kudarat": "064",
  Sulu: "068",
  "Surigao Del Norte": "086",
  "Surigao Del Sur": "086",
  Tarlac: "045",
  "Tawi-Tawi": "068",
  Zambales: "047",
  "Zamboanga Del Norte": "065",
  "Zamboanga Del Sur": "062",
  "Zamboanga Peninsula": "062",
  "Zamboanga Sibugay": "062",
};

/** Lowercase, trim, collapse whitespace, and strip diacritics for lookup. */
function normalizeKey(value: string): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

const provinceAreaCodeByKey = new Map<string, string>();
for (const [province, areaCode] of Object.entries(PROVINCE_AREA_CODES)) {
  provinceAreaCodeByKey.set(normalizeKey(province), areaCode);
}

/** PSGC "City of X" -> "X City" display name; other names are unchanged. */
function displayCityName(name: string): string {
  return name.startsWith(CITY_OF_PREFIX) ? `${name.slice(CITY_OF_PREFIX.length)} City` : name;
}

function sortedUnique(values: ReadonlyArray<string>): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "en"));
}

type CityRecord = {
  province: string;
  /** Raw PSGC city/municipality name, used as the barangay map key. */
  psgcName: string;
  displayName: string;
};

const provinceKeyToName = new Map<string, string>();
for (const province of PSGC_PROVINCES) provinceKeyToName.set(normalizeKey(province), province);
for (const [alias, province] of Object.entries(PROVINCE_ALIASES)) {
  provinceKeyToName.set(normalizeKey(alias), province);
}

function provinceLookupKeys(province: string): string[] {
  const keys = [normalizeKey(province)];
  for (const [alias, target] of Object.entries(PROVINCE_ALIASES)) {
    if (target === province) keys.push(normalizeKey(alias));
  }
  return keys;
}

const cityLookup = new Map<string, CityRecord>();
for (const province of PSGC_PROVINCES) {
  const provinceKeys = provinceLookupKeys(province);
  for (const psgcName of PSGC_CITIES[province] ?? []) {
    const displayName = displayCityName(psgcName);
    const record: CityRecord = { province, psgcName, displayName };
    const cityKeys = new Set([normalizeKey(psgcName), normalizeKey(displayName)]);
    for (const [alias, target] of Object.entries(CITY_ALIASES)) {
      if (normalizeKey(target) === normalizeKey(displayName)) cityKeys.add(normalizeKey(alias));
    }
    for (const provinceKey of provinceKeys) {
      for (const cityKey of cityKeys) cityLookup.set(`${provinceKey}|${cityKey}`, record);
    }
  }
}

const overlayLookup = new Map<string, PostalOverlay>();
for (const entry of POSTAL_OVERLAY) {
  const record = findCity(entry.province, entry.city);
  if (record) overlayLookup.set(`${record.province}|${record.psgcName}`, entry);
}

/** Resolve a province name (or alias) to its generated key, if known. */
function findProvince(province: string): string | undefined {
  const key = normalizeKey(province);
  return key ? provinceKeyToName.get(key) : undefined;
}

/** Resolve a province + city (any accepted spelling) to its PSGC record. */
function findCity(province: string, city: string): CityRecord | undefined {
  const provinceKey = normalizeKey(province);
  const cityKey = normalizeKey(city);
  if (!provinceKey || !cityKey) return undefined;
  return cityLookup.get(`${provinceKey}|${cityKey}`);
}

/** All PSGC province / pseudo-province names, sorted. */
export function listProvinces(): string[] {
  return [...PSGC_PROVINCES];
}

/** City/municipality names for a province (case-insensitive); empty when unknown. */
export function listCities(province: string): string[] {
  const provinceName = findProvince(province);
  if (!provinceName) return [];
  return sortedUnique((PSGC_CITIES[provinceName] ?? []).map(displayCityName));
}

/** Full PSGC barangay list for a city (case-insensitive); empty when unknown. */
export function listBarangays(province: string, city: string): string[] {
  const record = findCity(province, city);
  if (!record) return [];
  return [...(PSGC_BARANGAYS[`${record.province}/${record.psgcName}`] ?? [])];
}

/**
 * Resolved ZIP for a city. Precedence: an explicit curated overlay value, then
 * `CITY_PRINCIPAL_ZIPS` (the most common barangay ZIP of the municipality),
 * then the older `CITY_ZIPS` enrichment. Overlay `null` means "no opinion" and
 * falls through. Returns null only for an unknown city or when every layer has
 * no value. Callers must never overwrite a user-typed ZIP with null.
 */
export function postalFor(province: string, city: string): string | null {
  const record = findCity(province, city);
  if (!record) return null;
  const mapKey = `${record.province}/${record.psgcName}`;
  const overlay = overlayLookup.get(`${record.province}|${record.psgcName}`);
  if (overlay?.postalCode) return overlay.postalCode;
  return CITY_PRINCIPAL_ZIPS[mapKey] ?? CITY_ZIPS[mapKey] ?? null;
}

/**
 * Landline area code for a city. An explicit curated city value wins; otherwise
 * the province/pseudo-province table is used. Returns null only when the city
 * is unknown or its province has no assigned code.
 */
export function areaCodeForCity(province: string, city: string): string | null {
  const record = findCity(province, city);
  if (!record) return null;
  const overlay = overlayLookup.get(`${record.province}|${record.psgcName}`);
  if (overlay?.areaCode) return overlay.areaCode;
  return provinceAreaCodeByKey.get(normalizeKey(record.province)) ?? null;
}

/**
 * All province / pseudo-province display names whose city list contains the
 * given city (any accepted spelling: PSGC raw, display, or legacy alias).
 * Sorted, deduped. Empty when unknown/blank.
 */
export function provincesForCity(city: string): string[] {
  const key = normalizeKey(city);
  if (!key) return [];
  const targets = new Set([key]);
  for (const [alias, target] of Object.entries(CITY_ALIASES)) {
    if (normalizeKey(alias) === key) targets.add(normalizeKey(target));
  }
  const provinces: string[] = [];
  for (const province of PSGC_PROVINCES) {
    for (const psgcName of PSGC_CITIES[province] ?? []) {
      if (targets.has(normalizeKey(psgcName)) || targets.has(normalizeKey(displayCityName(psgcName)))) {
        provinces.push(province);
        break;
      }
    }
  }
  return sortedUnique(provinces);
}

/**
 * Dialing prefix for a city. countryCode is always "+63": the Philippine
 * numbering plan assigns the whole PSGC set to the single country code +63,
 * so no per-province lookup is needed; only the area code varies.
 */
export function dialingPrefixFor(
  province: string,
  city: string,
): { countryCode: string; areaCode: string | null } {
  return { countryCode: "+63", areaCode: areaCodeForCity(province, city) };
}

/**
 * Full location tree derived from the PSGC snapshot. Kept as an export for
 * callers that need the whole dataset; the list helpers above are the normal
 * entry points.
 */
export const PH_PROVINCES: PHProvince[] = PSGC_PROVINCES.map((province) => ({
  name: province,
  cities: listCities(province).map((city) => ({
    name: city,
    barangays: listBarangays(province, city),
    postalCode: postalFor(province, city),
    areaCode: areaCodeForCity(province, city),
  })),
}));

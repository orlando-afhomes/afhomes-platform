#!/usr/bin/env node
/**
 * Generates `src/shared/data/psgc-data.generated.ts` from the public PSGC API.
 *
 * Source: Philippine Statistics Authority (PSA), Philippine Standard Geographic
 * Code (PSGC), mirrored by https://psgc.gitlab.io/.
 *
 * This is a development-time script. It fetches the PSGC snapshot, keeps only
 * province / city-municipality / barangay NAMES (no PSGC codes), and writes a
 * compact TypeScript module. It also enriches the snapshot with two ZIP layers
 * (the PSGC GitLab mirror has no ZIP codes):
 *
 * - `CITY_PRINCIPAL_ZIPS`: one principal ZIP per municipality, computed from
 *   the barangay-level ZIP codes published by the Open Admin Data project
 *   (https://github.com/open-admin-data/philippines-administrative-divisions,
 *   CC-BY-4.0). The principal ZIP is the most frequent 4-digit ZIP across the
 *   municipality's barangays; ties resolve to the lowest numeric code.
 * - `CITY_ZIPS`: the older city-level enrichment from a community PSGC mirror.
 *
 * Run it manually when the reference data should be refreshed:
 *
 *   node scripts/generate-psgc.mjs
 *
 * The generated file is intentionally not wired to `npm run build`; refreshing
 * the reference data is a reviewed change.
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = "https://psgc.gitlab.io/api";
const OUTPUT_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/shared/data/psgc-data.generated.ts",
);

/**
 * PSGC puts independent / highly-urbanized cities directly under a region
 * (`provinceCode === false`). The address UI still needs a province-level
 * grouping, so those cities are attached to a region-based pseudo-province.
 * PSGC calls the NCR region "NCR"; the application has always used
 * "Metro Manila", so the pseudo-province keeps that established label.
 */
const REGION_PSEUDO_PROVINCE_LABELS = {
  "130000000": "Metro Manila",
};

const PSGC_ATTRIBUTION =
  "Philippine Statistics Authority (PSA) — Philippine Standard Geographic Code (PSGC)";

/**
 * City-level ZIP enrichment. The PSGC GitLab mirror publishes no ZIP codes, so
 * a second mirror is consulted. Sources are tried in order; the first one that
 * answers with a ZIP field wins. A total failure is non-fatal: the PSGC
 * snapshot is still emitted, with an empty `CITY_ZIPS`.
 */
const ZIP_SOURCES = [
  "https://psgc.cloud/api/cities-municipalities",
  "https://psgc.cloud/api/cities",
];
const ZIP_FIELD_CANDIDATES = ["zip_code", "zipCode", "zip", "postal_code", "postalCode"];
const ZIP_CODE_PATTERN = /^[0-9]{4}$/;

/**
 * Barangay-level ZIP source. 17 regional files, one row per barangay, each row
 * carrying `zip_codes`, a `level: 3` parent (the city/municipality) and the
 * full ancestor chain (level 2 = province, or a region-level pseudo-province).
 * Licensed CC-BY-4.0.
 */
const PRINCIPAL_ZIP_BASE_URL =
  "https://raw.githubusercontent.com/open-admin-data/philippines-administrative-divisions/main/data/barangay-by-region";
const PRINCIPAL_ZIP_FILES = [
  "autonomous-region-in-muslim-mindanao-ARMM.json",
  "bicol-region-R05.json",
  "cagayan-valley-R02.json",
  "calabarzon-R04A.json",
  "caraga-R13.json",
  "central-luzon-R03.json",
  "central-visayas-R07.json",
  "cordillera-administrative-region-CAR.json",
  "davao-region-R11.json",
  "eastern-visayas-R08.json",
  "ilocos-region-R01.json",
  "mimaropa-region-R17.json",
  "national-capital-region-NCR.json",
  "northern-mindanao-R10.json",
  "soccsksargen-R12.json",
  "western-visayas-R06.json",
  "zamboanga-peninsula-R09.json",
];
const PRINCIPAL_ZIP_ATTRIBUTION =
  "Open Admin Data — Philippines Administrative Divisions (CC-BY-4.0)";

/**
 * The barangay dataset spells some provinces with older or variant names.
 * Keys are normalized (lowercase, no diacritics); values are the generated
 * province keys used by `PSGC_CITIES`.
 */
const PRINCIPAL_PROVINCE_ALIASES = {
  "compostela valley": "Davao De Oro",
  "north cotabato": "Cotabato",
  "samar (western samar)": "Samar",
  "cotabato city (province)": "SOCCSKSARGEN",
  "isabela (province)": "Zamboanga Peninsula",
};

/**
 * Verified corrections where the computed principal ZIP is demonstrably not a
 * valid code for that city.
 *
 * - Metro Manila: the barangay dataset collapses the region into four shared
 *   zone codes (1440, 1500, 1630, 1012) instead of the city-specific PHLPost
 *   codes, so the computed value is another city's code (e.g. all 142 Quezon
 *   City barangays carry 1500). Cities whose computed value already belongs to
 *   them (San Juan 1500, Taguig 1630, Valenzuela 1440, Manila 1012) are left
 *   alone. Verified against the PHLPost ZIP directory.
 * - Name collisions outside Metro Manila: San Fernando (Pampanga) inherited
 *   Cebu's 6018, and Isabela City (Basilan) inherited Isabela (Negros
 *   Occidental)'s 6128. Both are the well-known PHLPost codes.
 */
const PRINCIPAL_ZIP_CORRECTIONS = {
  "Metro Manila/City of Caloocan": "1400",
  "Metro Manila/City of Las Piñas": "1740",
  "Metro Manila/City of Makati": "1200",
  "Metro Manila/City of Malabon": "1470",
  "Metro Manila/City of Mandaluyong": "1550",
  "Metro Manila/City of Marikina": "1800",
  "Metro Manila/City of Muntinlupa": "1770",
  "Metro Manila/City of Navotas": "1485",
  "Metro Manila/City of Parañaque": "1700",
  "Metro Manila/Pasay City": "1300",
  "Metro Manila/City of Pasig": "1600",
  "Metro Manila/Pateros": "1620",
  "Metro Manila/Quezon City": "1100",
  "Pampanga/City of San Fernando": "2000",
  "Zamboanga Peninsula/City of Isabela": "7300",
};

function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isAllCaps(value) {
  return /[A-Za-z]/.test(value) && value === value.toUpperCase();
}

function titleCase(value) {
  return value.toLowerCase().replace(/\b[a-z]/g, (character) => character.toUpperCase());
}

/**
 * PSGC GitLab currently publishes Title Case names. Only normalize when a whole
 * collection is ALL CAPS; mixed-case PSGC names are left untouched.
 */
function createNameNormalizer(rows, field = "name") {
  const names = rows.map((row) => normalizeWhitespace(row[field]));
  const allCaps = names.filter(Boolean).every(isAllCaps);
  return (row) => {
    const value = normalizeWhitespace(row[field]);
    return allCaps ? titleCase(value) : value;
  };
}

/**
 * Normalized city key used to match ZIP rows to PSGC cities when no PSGC code
 * is available. Strips the "City of " prefix and " City" suffix, folds
 * diacritics, lowercases, and collapses whitespace.
 */
function normalizeCityNameKey(value) {
  return normalizeWhitespace(value)
    .replace(/^City of\s+/i, "")
    .replace(/\s+City$/i, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function apiUrl(pathname) {
  return /^https?:\/\//i.test(pathname) ? pathname : `${API_BASE}/${pathname}`;
}

async function fetchJson(pathname, attempt = 1) {
  const url = apiUrl(pathname);
  try {
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json();
  } catch (error) {
    if (attempt >= 3) throw new Error(`Failed to fetch ${url}: ${error instanceof Error ? error.message : error}`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    return fetchJson(pathname, attempt + 1);
  }
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "en"));
}

function quote(value) {
  return JSON.stringify(value);
}

function formatStringArray(values) {
  return `[${values.map(quote).join(", ")}]`;
}

function formatRecord(entries) {
  if (entries.length === 0) return "{}";
  return `{\n${entries.map(([key, values]) => `  ${quote(key)}: ${formatStringArray(values)},`).join("\n")}\n}`;
}

function formatStringMap(entries) {
  if (entries.length === 0) return "{}";
  return `{\n${entries.map(([key, value]) => `  ${quote(key)}: ${quote(value)},`).join("\n")}\n}`;
}

/**
 * Fetch city-level ZIP rows. Returns `null` when every source fails, in which
 * case the script reports the failure and emits an empty ZIP map instead of
 * aborting the whole snapshot.
 */
async function fetchCityZipRows() {
  for (const url of ZIP_SOURCES) {
    try {
      const rows = await fetchJson(url);
      if (!Array.isArray(rows) || rows.length === 0) throw new Error("response is not a non-empty array");
      const firstRow = rows.find((row) => row && typeof row === "object");
      if (!firstRow) throw new Error("response has no object rows");
      const field = ZIP_FIELD_CANDIDATES.find(
        (candidate) => rows.filter((row) => row && typeof row === "object" && candidate in row).length > rows.length / 2,
      );
      if (!field) throw new Error(`no ZIP field (looked for ${ZIP_FIELD_CANDIDATES.join(", ")})`);
      return { url, field, rows };
    } catch (error) {
      console.warn(`  ZIP source unavailable: ${url} — ${error instanceof Error ? error.message : error}`);
    }
  }
  return null;
}

/** Single 4-digit ZIP for a ZIP row, or null when empty/multi/non-standard. */
function extractZip(row, field) {
  const raw = row[field];
  const value = typeof raw === "number" ? String(raw) : normalizeWhitespace(raw);
  return ZIP_CODE_PATTERN.test(value) ? value : null;
}

/** Case/diacritic-insensitive key for province-name matching. */
function normalizeProvinceKey(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Most frequent ZIP, ties resolved to the lowest numeric code. */
function pickPrincipalZip(zipCounts) {
  let best = null;
  for (const [zip, count] of zipCounts) {
    if (
      best === null ||
      count > best.count ||
      (count === best.count && zip < best.zip)
    ) {
      best = { zip, count };
    }
  }
  return best?.zip ?? null;
}

/**
 * Fetch the 17 barangay files and group them by the level-3 parent (the
 * city/municipality). A total failure is fatal: the principal ZIP map is a
 * required output, unlike the optional `CITY_ZIPS` enrichment.
 */
async function fetchPrincipalZipGroups() {
  const payloads = await Promise.all(
    PRINCIPAL_ZIP_FILES.map((file) => fetchJson(`${PRINCIPAL_ZIP_BASE_URL}/${file}`)),
  );
  const groups = new Map();
  let skippedRows = 0;
  for (const rows of payloads) {
    if (!Array.isArray(rows)) throw new Error("Unexpected barangay payload: response is not an array.");
    for (const row of rows) {
      const parent = row?.parent;
      if (!parent || typeof parent.id !== "string" || parent.level !== 3) {
        skippedRows += 1;
        continue;
      }
      let group = groups.get(parent.id);
      if (!group) {
        group = {
          id: parent.id,
          cityName: normalizeWhitespace(parent.name?.en),
          provinceName: normalizeWhitespace(
            (row.ancestors ?? []).find((ancestor) => ancestor.level === 2)?.name?.en,
          ),
          zipCounts: new Map(),
        };
        groups.set(parent.id, group);
      }
      for (const raw of row.zip_codes ?? []) {
        const value = typeof raw === "number" ? String(raw) : normalizeWhitespace(raw);
        if (!ZIP_CODE_PATTERN.test(value)) continue;
        group.zipCounts.set(value, (group.zipCounts.get(value) ?? 0) + 1);
      }
    }
  }
  return { groups, skippedRows };
}

async function main() {
  console.log("Fetching PSGC snapshot…");
  const [provinces, cities, barangays, regions, zipSource, principalSource] = await Promise.all([
    fetchJson("provinces.json"),
    fetchJson("cities-municipalities.json"),
    fetchJson("barangays.json"),
    fetchJson("regions.json"),
    fetchCityZipRows(),
    fetchPrincipalZipGroups(),
  ]);

  if (!Array.isArray(provinces) || !Array.isArray(cities) || !Array.isArray(barangays) || !Array.isArray(regions)) {
    throw new Error("Unexpected PSGC payload: one of the endpoint responses is not an array.");
  }

  // Fail loudly if the API shape changes instead of emitting a plausible but
  // silently incomplete snapshot.
  if (!cities.every((city) => typeof city.code === "string" && typeof city.name === "string")) {
    throw new Error("Unexpected PSGC city payload: missing `code` or `name`.");
  }
  if (!barangays.every((barangay) => typeof barangay.name === "string")) {
    throw new Error("Unexpected PSGC barangay payload: missing `name`.");
  }

  const provinceName = createNameNormalizer(provinces);
  const cityName = createNameNormalizer(cities);
  const barangayName = createNameNormalizer(barangays);
  const regionName = createNameNormalizer(regions);

  const provinceNameByCode = new Map(
    provinces
      .filter((province) => province.code && province.name)
      .map((province) => [province.code, provinceName(province)]),
  );
  const regionNameByCode = new Map(
    regions
      .filter((region) => region.code && (region.name || region.regionName))
      .map((region) => [region.code, normalizeWhitespace(REGION_PSEUDO_PROVINCE_LABELS[region.code] ?? regionName(region))]),
  );

  // Province codes must resolve; otherwise the city cannot be placed in the
  // province -> city -> barangay contract and is skipped with a report.
  const skippedCityReasons = [];
  const cityEntries = [];
  for (const city of cities.slice().sort((a, b) => cityName(a).localeCompare(cityName(b), "en"))) {
    const name = cityName(city);
    if (!name) continue;

    let province = city.provinceCode ? provinceNameByCode.get(city.provinceCode) : undefined;
    if (!province && city.provinceCode === false) {
      const regionCode = city.regionCode;
      province = REGION_PSEUDO_PROVINCE_LABELS[regionCode] ?? regionNameByCode.get(regionCode);
    }

    if (!province) {
      skippedCityReasons.push(`${name} (provinceCode=${String(city.provinceCode)}, regionCode=${String(city.regionCode)})`);
      continue;
    }

    cityEntries.push({
      code: city.code,
      // 10-digit PSGC code used to join the separate ZIP list, which publishes
      // codes in the 10-digit form.
      zipCode: normalizeWhitespace(city.psgc10DigitCode),
      name,
      provinceName: province,
    });
  }

  const cityCodeToEntry = new Map(cityEntries.map((entry) => [entry.code, entry]));
  const citiesByProvince = new Map();
  for (const entry of cityEntries) {
    const bucket = citiesByProvince.get(entry.provinceName) ?? [];
    bucket.push(entry.name);
    citiesByProvince.set(entry.provinceName, bucket);
  }

  const barangaysByCity = new Map();
  let skippedBarangayCount = 0;
  for (const barangay of barangays) {
    const hostCode = barangay.cityCode || barangay.municipalityCode;
    const host = hostCode ? cityCodeToEntry.get(hostCode) : undefined;
    const name = barangayName(barangay);
    if (!host || !name) {
      skippedBarangayCount += 1;
      continue;
    }
    const key = `${host.provinceName}/${host.name}`;
    const bucket = barangaysByCity.get(key) ?? [];
    bucket.push(name);
    barangaysByCity.set(key, bucket);
  }

  // City-level ZIPs. PSGC codes are matched first (authoritative). A name
  // fallback is used only when both the ZIP row name and the PSGC city name are
  // globally unique, so same-named cities in different provinces cannot inherit
  // each other's ZIP.
  const cityZips = new Map();
  const zipByCode = new Map();
  const zipByName = new Map();
  const cityNameCounts = new Map();
  for (const entry of cityEntries) {
    const nameKey = normalizeCityNameKey(entry.name);
    cityNameCounts.set(nameKey, (cityNameCounts.get(nameKey) ?? 0) + 1);
  }

  let skippedZipValues = 0;
  if (zipSource) {
    for (const row of zipSource.rows) {
      const zip = extractZip(row, zipSource.field);
      if (!zip) {
        skippedZipValues += 1;
        continue;
      }
      const code = normalizeWhitespace(row.code ?? row.psgc10DigitCode);
      if (/^[0-9]{10}$/.test(code)) zipByCode.set(code, zip);
      const nameKey = normalizeCityNameKey(row.name);
      if (!nameKey) continue;
      const bucket = zipByName.get(nameKey) ?? new Set();
      bucket.add(zip);
      zipByName.set(nameKey, bucket);
    }
  }

  const zipAmbiguities = [];
  const zipAmbiguousCities = [];
  const zipConflicts = [];
  let zipByNameCount = 0;
  for (const entry of cityEntries) {
    let zip = entry.zipCode ? zipByCode.get(entry.zipCode) : undefined;
    let matchedByName = false;
    if (!zip) {
      const nameKey = normalizeCityNameKey(entry.name);
      const candidates = zipByName.get(nameKey);
      if (candidates && candidates.size === 1 && cityNameCounts.get(nameKey) === 1) {
        zip = [...candidates][0];
        matchedByName = true;
      } else if (candidates && candidates.size > 1) {
        const message = `${entry.name} (ZIPs ${[...candidates].sort().join(", ")})`;
        if (!zipAmbiguities.includes(message)) zipAmbiguities.push(message);
        zipAmbiguousCities.push(`${entry.provinceName}/${entry.name}`);
        continue;
      }
    }
    if (!zip) continue;

    const key = `${entry.provinceName}/${entry.name}`;
    const existing = cityZips.get(key);
    if (existing && existing !== zip) {
      cityZips.delete(key);
      zipConflicts.push(`${key} (ZIPs ${existing}, ${zip})`);
      continue;
    }
    cityZips.set(key, zip);
    if (matchedByName) zipByNameCount += 1;
  }

  const provinceNames = sortedUnique([...citiesByProvince.keys()]);

  // Principal ZIP per municipality from the barangay dataset. The level-3
  // parent id is the 6-digit municipality code, which is also the first six
  // digits of the 9-digit PSGC city code; matching on it avoids the many
  // spelling differences between the two datasets ("City of Naga" vs "Naga
  // City", "Makati" vs "City of Makati", ...). Province comes from the level-2
  // ancestor, mapped onto the generated province keys.
  const provinceNameByKey = new Map(provinceNames.map((name) => [normalizeProvinceKey(name), name]));
  const cityEntryByShortCode = new Map(cityEntries.map((entry) => [String(entry.code).slice(0, 6), entry]));
  const principalZips = new Map();
  const principalSkippedReasons = [];
  let principalGroupsWithoutZip = 0;
  for (const group of principalSource.groups.values()) {
    const entry = cityEntryByShortCode.get(group.id);
    if (!entry) {
      principalSkippedReasons.push(`${group.cityName} (parent ${group.id}): no PSGC city`);
      continue;
    }
    const provinceKey = normalizeProvinceKey(group.provinceName);
    const province = provinceNameByKey.get(provinceKey) ?? PRINCIPAL_PROVINCE_ALIASES[provinceKey];
    if (!province) {
      principalSkippedReasons.push(`${group.cityName}: unknown province "${group.provinceName}"`);
      continue;
    }
    const zip = pickPrincipalZip(group.zipCounts);
    if (!zip) {
      principalGroupsWithoutZip += 1;
      continue;
    }
    principalZips.set(`${province}/${entry.name}`, zip);
  }

  const principalCorrectionsApplied = [];
  for (const [key, zip] of Object.entries(PRINCIPAL_ZIP_CORRECTIONS)) {
    const current = principalZips.get(key);
    if (!current) throw new Error(`Principal ZIP correction targets an unknown city: ${key}`);
    if (current !== zip) principalCorrectionsApplied.push(`${key} (${current} -> ${zip})`);
    principalZips.set(key, zip);
  }

  const missingPrincipalKeys = cityEntries
    .map((entry) => `${entry.provinceName}/${entry.name}`)
    .filter((key) => !principalZips.has(key));
  const principalZipEntries = [...principalZips.entries()].sort((a, b) => a[0].localeCompare(b[0], "en"));

  const cityRecordEntries = provinceNames.map((provinceName) => [
    provinceName,
    sortedUnique(citiesByProvince.get(provinceName) ?? []),
  ]);
  const barangayRecordEntries = [...barangaysByCity.keys()]
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((key) => [key, sortedUnique(barangaysByCity.get(key) ?? [])]);

  const cityZipEntries = [...cityZips.entries()].sort((a, b) => a[0].localeCompare(b[0], "en"));

  const snapshotDate = new Date().toISOString().slice(0, 10);
  const zipSourceLines = zipSource ? [` * - ${zipSource.url} (city-level \`${zipSource.field}\` ZIP codes)`] : [];
  const header = `/**
 * PSGC location snapshot — generated file, do not edit by hand.
 *
 * Regenerate with: node scripts/generate-psgc.mjs
 * Snapshot date: ${snapshotDate}
 *
 * Sources:
 * - ${API_BASE}/provinces.json
 * - ${API_BASE}/cities-municipalities.json
 * - ${API_BASE}/barangays.json
 * - ${API_BASE}/regions.json (region grouping for independent cities)
 * - ${PRINCIPAL_ZIP_BASE_URL}/*.json (barangay ZIP codes, 17 regional files)
${zipSourceLines.map((line) => `${line}\n`).join("")} *
 * Attribution: ${PSGC_ATTRIBUTION} (https://psgc.gitlab.io/).
 * Barangay ZIP data: ${PRINCIPAL_ZIP_ATTRIBUTION},
 * https://github.com/open-admin-data/philippines-administrative-divisions.
 *
 * ZIP layers (both keyed exactly like \`PSGC_BARANGAYS\`,
 * "<province>/<PSGC city name>"):
 * - \`CITY_PRINCIPAL_ZIPS\` is the most frequent 4-digit ZIP across a
 *   municipality's barangays; ties resolve to the lowest numeric code. A small
 *   verified correction list replaces values that are demonstrably another
 *   city's code: the shared Metro Manila zone codes plus two name collisions.
 * - \`CITY_ZIPS\` is the older city-level enrichment. Only a single 4-digit ZIP
 *   per city is kept; cities whose source value is empty, non-standard, or
 *   ambiguous across same-named localities are omitted rather than guessed.
 * The curated overlay in \`philippine-locations.ts\` takes precedence over both.
 * Names are reproduced as published (PSGC currently returns Title Case); no
 * codes are retained in this module. Province -> city -> barangay keys use
 * PSGC names. Independent / highly-urbanized cities whose \`provinceCode\` is
 * \`false\` are grouped under a region-based pseudo-province: Metro Manila
 * (PSGC NCR), SOCCSKSARGEN (Cotabato City), and Zamboanga Peninsula
 * (Isabela City). PSGC's NCR region is labelled "Metro Manila" for continuity
 * with the existing address UI.
 */

`;

  const body = `export const PSGC_PROVINCES: string[] = ${formatStringArray(provinceNames)};

export const PSGC_CITIES: Record<string, string[]> = ${formatRecord(cityRecordEntries)};

export const PSGC_BARANGAYS: Record<string, string[]> = ${formatRecord(barangayRecordEntries)};

export const CITY_ZIPS: Record<string, string> = ${formatStringMap(cityZipEntries)};

export const CITY_PRINCIPAL_ZIPS: Record<string, string> = ${formatStringMap(principalZipEntries)};
`;

  await writeFile(OUTPUT_FILE, header + body, "utf8");

  const emittedBarangays = barangayRecordEntries.reduce((total, [, names]) => total + names.length, 0);
  console.log(`Wrote ${path.relative(process.cwd(), OUTPUT_FILE)}`);
  console.log(`  provinces/pseudo-provinces: ${provinceNames.length}`);
  console.log(`  cities/municipalities: ${cityEntries.length}`);
  console.log(`  barangays: ${emittedBarangays}`);
  console.log(`  city groups: ${cityRecordEntries.length}`);
  console.log(`  barangay groups: ${barangayRecordEntries.length}`);
  console.log(
    `  cities with ZIP: ${cityZipEntries.length} of ${cityEntries.length}${zipByNameCount > 0 ? ` (${zipByNameCount} matched by name)` : ""}`,
  );
  console.log(`  cities with principal ZIP: ${principalZipEntries.length} of ${cityEntries.length}`);
  if (principalCorrectionsApplied.length > 0) {
    console.log(`  principal ZIP corrections: ${principalCorrectionsApplied.length}`);
    for (const correction of principalCorrectionsApplied) console.log(`    - ${correction}`);
  }
  if (missingPrincipalKeys.length > 0) {
    console.warn(`  cities WITHOUT a principal ZIP: ${missingPrincipalKeys.length}`);
    for (const key of missingPrincipalKeys) console.warn(`    - ${key}`);
  }
  if (principalSkippedReasons.length > 0) {
    console.warn(`  barangay groups not used: ${principalSkippedReasons.length}`);
    for (const reason of principalSkippedReasons) console.warn(`    - ${reason}`);
  }
  if (principalGroupsWithoutZip > 0) console.warn(`  municipalities with no usable barangay ZIP: ${principalGroupsWithoutZip}`);
  if (principalSource.skippedRows > 0) console.warn(`  non-barangay rows skipped: ${principalSource.skippedRows}`);
  if (zipSource) console.log(`  ZIP source: ${zipSource.url} (field \`${zipSource.field}\`)`);
  if (skippedCityReasons.length > 0) {
    console.warn(`  skipped cities: ${skippedCityReasons.length}`);
    for (const reason of skippedCityReasons) console.warn(`    - ${reason}`);
  }
  if (skippedBarangayCount > 0) {
    console.warn(`  skipped barangays: ${skippedBarangayCount}`);
  }
  if (skippedZipValues > 0) console.log(`  ZIP rows without a single 4-digit value: ${skippedZipValues}`);
  if (zipAmbiguities.length > 0) {
    console.warn(
      `  cities skipped for ZIP ambiguity (same name, different ZIPs): ${zipAmbiguousCities.length} cities, ${zipAmbiguities.length} names`,
    );
    for (const reason of zipAmbiguities) console.warn(`    - ${reason}`);
  }
  if (zipConflicts.length > 0) {
    console.warn(`  ZIP key conflicts: ${zipConflicts.length}`);
    for (const reason of zipConflicts) console.warn(`    - ${reason}`);
  }
  const pseudo = provinceNames.filter((name) => !provinces.some((province) => provinceName(province) === name));
  if (pseudo.length > 0) console.log(`  region pseudo-provinces: ${pseudo.join(", ")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

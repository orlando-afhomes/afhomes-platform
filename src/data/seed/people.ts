import { dialingPrefixFor } from "@/shared/data/philippine-locations";
import type { AddressValue } from "@/shared/forms/types";

/**
 * Synthetic people details for the seed. Every value is invented: names are
 * common Filipino given names and surnames in uncommon combinations, and every
 * address uses a real PSGC province, city and barangay so the address pickers
 * resolve it. Generators are deterministic: the same index always gives the
 * same value, and nothing uses Math.random().
 *
 * shortcut: real-looking email domains are display-only mock data, replace with real records at import.
 * The mock never sends email, SMS or any other message.
 */

export type SeedAddress = AddressValue;

/** Real PSGC locations (Laguna first, then nearby provinces and Metro Manila). */
const LOCATIONS: ReadonlyArray<Omit<SeedAddress, "street">> = [
  { province: "Laguna", city: "Calamba City", barangay: "Banlic", postalCode: "4027" },
  { province: "Laguna", city: "Santa Rosa City", barangay: "Balibago", postalCode: "4026" },
  { province: "Laguna", city: "Biñan City", barangay: "Canlalay", postalCode: "4024" },
  { province: "Laguna", city: "Cabuyao City", barangay: "Banaybanay", postalCode: "4025" },
  { province: "Laguna", city: "San Pablo City", barangay: "Atisan", postalCode: "4000" },
  { province: "Laguna", city: "Los Baños", barangay: "Batong Malake", postalCode: "4030" },
  { province: "Laguna", city: "San Pedro City", barangay: "Calendola", postalCode: "4023" },
  { province: "Laguna", city: "Santa Cruz", barangay: "Bagumbayan", postalCode: "4009" },
  { province: "Metro Manila", city: "Quezon City", barangay: "Bagbag", postalCode: "1100" },
  { province: "Metro Manila", city: "Makati City", barangay: "Bel-Air", postalCode: "1200" },
  { province: "Metro Manila", city: "Pasig City", barangay: "Caniogan", postalCode: "1600" },
  { province: "Metro Manila", city: "Taguig City", barangay: "Central Bicutan", postalCode: "1630" },
  { province: "Metro Manila", city: "Parañaque City", barangay: "B. F. Homes", postalCode: "1700" },
  { province: "Metro Manila", city: "Muntinlupa City", barangay: "Alabang", postalCode: "1770" },
  { province: "Metro Manila", city: "Marikina City", barangay: "Concepcion Uno", postalCode: "1807" },
  { province: "Cavite", city: "Bacoor City", barangay: "Aniban II", postalCode: "4102" },
  { province: "Cavite", city: "Dasmariñas City", barangay: "Burol I", postalCode: "4114" },
  { province: "Cavite", city: "Imus City", barangay: "Anabu I-A", postalCode: "4103" },
  { province: "Batangas", city: "Batangas City", barangay: "Alangilan", postalCode: "4200" },
  { province: "Batangas", city: "Lipa City", barangay: "Antipolo Del Norte", postalCode: "4217" },
  { province: "Rizal", city: "Antipolo City", barangay: "Dela Paz (Pob.)", postalCode: "1870" },
  { province: "Rizal", city: "Cainta", barangay: "San Isidro", postalCode: "1900" },
  { province: "Rizal", city: "Taytay", barangay: "Muzon", postalCode: "1920" },
];

const STREETS = [
  "Mabini Street", "Rizal Avenue", "Del Pilar Street", "Sampaguita Street", "Narra Avenue", "Acacia Lane",
  "Kalayaan Avenue", "Luna Street", "Molave Street", "Ilang-Ilang Street", "Bonifacio Street", "Burgos Street",
  "Magsaysay Avenue", "Dahlia Street", "Gumamela Street", "Quezon Avenue", "Aguinaldo Street", "Jasmine Street",
  "Mahogany Drive", "Orchid Street", "Laurel Street", "Banaba Street", "Kamagong Street",
];

/** Block-and-lot or house-number street line in a real barangay. */
export function addressAt(index: number): SeedAddress {
  const location = LOCATIONS[(index * 7 + 3) % LOCATIONS.length];
  const street = STREETS[(index * 5 + 1) % STREETS.length];
  const line = index % 3 === 0
    ? `Blk ${(index % 19) + 2} Lot ${(index * 3) % 27 + 4}, ${street}`
    : `${(index * 37) % 380 + 12} ${street}`;
  return { street: line, ...location };
}

const MOBILE_PREFIXES = ["0917", "0918", "0927", "0998", "0906", "0915", "0939", "0961", "0977", "0995"];

/** Valid Philippine mobile number; digits are spread so numbers never run in sequence. */
export function mobileAt(index: number): string {
  const prefix = MOBILE_PREFIXES[index % MOBILE_PREFIXES.length];
  const body = String((index * 7_919_311 + 2_604_417) % 10_000_000).padStart(7, "0");
  return prefix + body;
}

/** Local landline number (the area code comes from the address): 8 digits for 02, 7 for provincial codes. */
export function landlineAt(index: number, address: Pick<SeedAddress, "province" | "city">): string {
  const body = String((index * 48_271 + 5_120_000) % 10_000_000).padStart(7, "0");
  const local = `${body.slice(0, 3)}-${body.slice(3)}`;
  const areaCode = dialingPrefixFor(address.province, address.city).areaCode?.replace(/\D/g, "");
  return areaCode === "2" || areaCode === "02" ? `8${local}` : local;
}

/** TIN: 9 digits (owner instruction 2026-11-20), shown as NNN-NNN-NNN. */
export function tinAt(index: number): string {
  const digits = String((index * 104_729 + 312_457_881) % 1_000_000_000).padStart(9, "0");
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Government ID number in a plausible format for its type. */
export function governmentIdAt(type: string, index: number): string {
  const n = (width: number, salt: number) => String((index * 2_654_435 + salt) % 10 ** width).padStart(width, "0");
  switch (type) {
    case "Philippine National ID": return `${n(4, 1201)}-${n(4, 8812)}-${n(4, 3307)}-${n(4, 9013)}`;
    case "Passport": return `P${n(7, 40_217)}${String.fromCharCode(65 + (index % 26))}`;
    case "Driver's License": return `D${n(2, 17)}-${n(2, 41)}-${n(6, 50_311)}`;
    case "SSS ID": return `${n(2, 33)}-${n(7, 70_121)}-${n(1, 7)}`;
    case "UMID": return `${n(4, 11)}-${n(7, 61_003)}-${n(1, 3)}`;
    case "PRC ID": return n(7, 81_207);
    case "Postal ID": return n(12, 512_377);
    default: return n(10, 99_017);
  }
}

export const GOVERNMENT_ID_TYPES = ["Philippine National ID", "Driver's License", "Passport", "SSS ID", "UMID", "Postal ID", "PRC ID"] as const;

const EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "gmail.com", "outlook.com"];

const ascii = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, "");

/** Personal email for a customer. */
export function personalEmail(firstName: string, lastName: string, index: number): string {
  const domain = EMAIL_DOMAINS[index % EMAIL_DOMAINS.length];
  const separator = index % 3 === 1 ? "" : ".";
  return `${ascii(firstName)}${separator}${ascii(lastName)}${index % 4 === 2 ? String(80 + (index % 17)) : ""}@${domain}`;
}

/** Company email for staff and accredited sellers. */
export function companyEmail(firstName: string, lastName: string): string {
  return `${ascii(firstName)}.${ascii(lastName)}@afhomes.com.ph`;
}

/** Deterministic 32-character hex token (for QR and correction links). */
export function tokenAt(index: number, salt: string): string {
  let hash = 2_166_136_261;
  let out = "";
  const source = `${salt}:${index}`;
  for (let round = 0; out.length < 32; round += 1) {
    for (const char of `${source}:${round}`) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16_777_619) >>> 0;
    }
    out += hash.toString(16).padStart(8, "0");
  }
  return out.slice(0, 32);
}

export type PersonName = { firstName: string; middleName: string | null; lastName: string; suffix?: string | null; gender: "Male" | "Female" };

/** Customer names for the seed (unique full names). */
export const CUSTOMER_NAMES: readonly PersonName[] = [
  { firstName: "Cristina", middleName: "Lopez", lastName: "Villareal", gender: "Female" },
  { firstName: "Benjamin", middleName: "Ramos", lastName: "Tolentino", gender: "Male" },
  { firstName: "Jerome", middleName: "Abad", lastName: "Salvador", gender: "Male" },
  { firstName: "Marilou", middleName: "Santos", lastName: "Evangelista", gender: "Female" },
  { firstName: "Leonardo", middleName: "Cruz", lastName: "Panganiban", gender: "Male" },
  { firstName: "Josephine", middleName: "Dela Peña", lastName: "Macaraeg", gender: "Female" },
  { firstName: "Ricardo", middleName: null, lastName: "Buenaventura", gender: "Male" },
  { firstName: "Angelica", middleName: "Morales", lastName: "Sison", gender: "Female" },
  { firstName: "Fernando", middleName: "Reyes", lastName: "Lacson", gender: "Male" },
  { firstName: "Rosemarie", middleName: "Ignacio", lastName: "Dimaculangan", gender: "Female" },
  { firstName: "Antonio", middleName: "Gatchalian", lastName: "Espiritu", gender: "Male" },
  { firstName: "Maricel", middleName: "Tan", lastName: "Quiambao", gender: "Female" },
  { firstName: "Romeo", middleName: "Javier", lastName: "Cabrera", gender: "Male" },
  { firstName: "Imelda", middleName: "Valdez", lastName: "Arcilla", gender: "Female" },
  { firstName: "Danilo", middleName: "Perez", lastName: "Magbanua", gender: "Male" },
  { firstName: "Sheila", middleName: "Aquino", lastName: "Montemayor", gender: "Female" },
  { firstName: "Ernesto", middleName: "Lim", lastName: "Batungbakal", gender: "Male" },
  { firstName: "Lorna", middleName: "Ferrer", lastName: "Galang", gender: "Female" },
  { firstName: "Alfredo", middleName: "Manalastas", lastName: "Ocampo", gender: "Male" },
  { firstName: "Corazon", middleName: "Bernardo", lastName: "Hizon", gender: "Female" },
  { firstName: "Rodel", middleName: null, lastName: "Agbayani", gender: "Male" },
  { firstName: "Charito", middleName: "Diaz", lastName: "Lualhati", gender: "Female" },
  { firstName: "Wilfredo", middleName: "Santiago", lastName: "Mangubat", gender: "Male" },
  { firstName: "Evelyn", middleName: "Robles", lastName: "Samonte", gender: "Female" },
  { firstName: "Nestor", middleName: "Medina", lastName: "Caballero", gender: "Male" },
  { firstName: "Gemma", middleName: "Castro", lastName: "Alvarado", gender: "Female" },
  { firstName: "Reynaldo", middleName: "Velasco", lastName: "Dumlao", gender: "Male" },
  { firstName: "Teresa", middleName: "Mercado", lastName: "Ilagan", gender: "Female" },
  { firstName: "Arturo", middleName: "Pineda", lastName: "Sevilla", gender: "Male" },
  { firstName: "Melinda", middleName: "Gomez", lastName: "Fajardo", gender: "Female" },
  { firstName: "Joel", middleName: "Navarro", lastName: "Umali", gender: "Male" },
  { firstName: "Divina", middleName: "Ortiz", lastName: "Carandang", gender: "Female" },
  { firstName: "Raymund", middleName: "Ventura", lastName: "Katigbak", gender: "Male" },
  { firstName: "Florencia", middleName: "Rivera", lastName: "Mallari", gender: "Female" },
];

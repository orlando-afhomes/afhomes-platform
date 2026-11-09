/**
 * AFHomes shared form system: types, formatting helpers, and validators.
 * Import from "@/shared/forms"; the field components live in "@/shared/forms/modern".
 *
 * Business rules (genealogy, accreditation, AA issuance, permissions) stay
 * in their owning domain modules and must never leak into these helpers.
 */
export * from "./types";
export * from "./formatting/text";
export * from "./formatting/phone";
export * from "./formatting/identification";
export * from "./validation/person-name";
export * from "./validation/contact";
export * from "./validation/address";
export * from "./validation/identification";
export * from "./validation/dates";

/**
 * AFHomes shared form system: typed field components, formatting helpers,
 * and validators. Import from "@/shared/forms".
 *
 * Business rules (genealogy, accreditation, AA issuance, permissions) stay
 * in their owning domain modules and must never leak into these components.
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
export * from "./components/TextField";
export * from "./components/PersonNameField";
export * from "./components/PhoneFields";
export * from "./components/EmailField";
export * from "./components/PasswordFields";
export * from "./components/TinField";
export * from "./components/SelectField";
export * from "./components/SuffixField";
export * from "./components/ProfilePhotoUploader";
export * from "./components/StandardDateField";
export * from "./components/GovernmentIdFields";
export * from "./components/AddressFields";

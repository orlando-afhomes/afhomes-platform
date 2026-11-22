import type { AcquisitionChannel, Customer, CustomerDraftInput, SupplementaryHolder } from "@/modules/customers/types";
import { citizenshipLabels } from "@/modules/customers/citizenship";
import { composeCustomerName } from "@/modules/customers/rules";
import type { AddressValue, OfficeAddressValue } from "@/shared/forms/types";
import { normalizePhilippineMobile } from "@/shared/utils/input-sanitizers";

const EMPTY_ADDRESS: AddressValue = { street: "", province: "", city: "", barangay: "", postalCode: "" };
const EMPTY_OFFICE: OfficeAddressValue = { street: "", municipality: "", province: "", postalCode: "" };

export type CustomerDraft = {
  firstName: string;
  middleName: string;
  noMiddleName: boolean;
  lastName: string;
  suffix: string;
  /** Optional courtesy title from the fixed list. */
  prefix: string;
  gender: string;
  civilStatus: string;
  dateOfBirth: string;
  mobileNumber: string;
  email: string;
  address: AddressValue;
  governmentIdType: string;
  governmentIdNumber: string;
  citizenship: string;
  citizenshipCodes: string[];
  tinNumber: string;
  landline: string;
  occupation: string;
  businessIndustry: string;
  employedPosition: string;
  officeAddress: OfficeAddressValue;
  vipPlan: string;
  secEnabled: boolean;
  secFirstName: string;
  secMiddleName: string;
  secNoMiddleName: boolean;
  secLastName: string;
  secSuffix: string;
  secGender: string;
  secCivilStatus: string;
  secDateOfBirth: string;
  secMobileNumber: string;
  secEmail: string;
  secAddress: AddressValue;
  secGovernmentIdType: string;
  secGovernmentIdNumber: string;
  secCitizenship: string;
  secTinNumber: string;
  secLandline: string;
  secOccupation: string;
  secBusinessIndustry: string;
  secEmployedPosition: string;
  secOfficeAddress: OfficeAddressValue;
  paymentSchemeId: string;
  contractClassification: string;
  /** Same person as the referrer ("Referrer / VIP Recommender" is one field, doc 04 section 7.8); kept in step with it. */
  recommenderMemberId: string;
  /** Optional referrer, IST or OST; may be a different person from the closing seller. */
  referrerMemberId: string;
  /** Short reference to an existing dated referral, needed when the closing seller is also the referrer. */
  referralReference: string;
  acquisitionChannel: string;
  /** Automatic IDs are assigned on submit; manual IDs are entered and fixed. */
  customerIdMode: "auto" | "manual";
  customerNumber: string;
  /** Closing seller (IST or OST). Empty on a seller's own draft, which belongs to that seller. */
  ownerMemberId: string;
  consentDataPrivacy: boolean;
  idReceivedCertified: boolean;
};

export type CustomerErrors = Record<string, string | undefined>;
export type SetDraft = <K extends keyof CustomerDraft>(key: K, value: CustomerDraft[K]) => void;

// The landed SupplementaryHolder covers the spec's secCitizenship/secTinNumber/
// secLandline/secOccupation/secBusinessIndustry/secEmployedPosition/
// secOfficeAddress keys but not the sec mirror's contact/address/ID keys, so
// this view reads those until the types worker extends the holder. The form
// spec (and the wizard reset) require the full mirror.
type HolderSource = SupplementaryHolder &
  Partial<{
    civilStatus: string | null;
    mobileNumber: string | null;
    email: string | null;
    address: AddressValue | null;
    governmentIdType: string | null;
    governmentIdNumber: string | null;
  }>;

export function toDraft(customer?: Customer): CustomerDraft {
  const holder = customer?.supplementaryHolder as HolderSource | null | undefined;
  return {
    firstName: customer?.firstName ?? "",
    middleName: customer?.middleName ?? "",
    noMiddleName: customer?.noMiddleName ?? Boolean(customer && customer.firstName && !customer.middleName),
    prefix: customer?.prefix ?? "",
    lastName: customer?.lastName ?? "",
    suffix: customer?.suffix ?? "",
    gender: customer?.gender ?? "",
    civilStatus: customer?.civilStatus ?? "",
    dateOfBirth: customer?.dateOfBirth ?? "",
    mobileNumber: customer?.mobileNumber ?? "",
    email: customer?.email ?? "",
    address: customer?.address ? { ...customer.address } : { ...EMPTY_ADDRESS },
    governmentIdType: customer?.governmentIdType ?? "",
    governmentIdNumber: customer?.governmentIdNumber ?? "",
    citizenship: customer?.citizenship ?? "",
    citizenshipCodes: customer?.citizenshipCodes ?? [],
    tinNumber: customer?.tinNumber ?? "",
    landline: customer?.landline ?? "",
    occupation: customer?.occupation ?? "",
    businessIndustry: customer?.businessIndustry ?? "",
    employedPosition: customer?.employedPosition ?? "",
    officeAddress: customer?.officeAddress ? { ...customer.officeAddress } : { ...EMPTY_OFFICE },
    vipPlan: customer?.vipPlan ?? "",
    secEnabled: Boolean(holder),
    secFirstName: holder?.firstName ?? "",
    secMiddleName: holder?.middleName ?? "",
    secNoMiddleName: holder?.noMiddleName ?? Boolean(holder && holder.firstName && !holder.middleName),
    secLastName: holder?.lastName ?? "",
    secSuffix: holder?.suffix ?? "",
    secGender: holder?.gender ?? "",
    secCivilStatus: holder?.civilStatus ?? "",
    secDateOfBirth: holder?.dateOfBirth ?? "",
    secMobileNumber: holder?.mobileNumber ?? "",
    secEmail: holder?.email ?? "",
    secAddress: holder?.address ? { ...holder.address } : { ...EMPTY_ADDRESS },
    secGovernmentIdType: holder?.governmentIdType ?? "",
    secGovernmentIdNumber: holder?.governmentIdNumber ?? "",
    secCitizenship: holder?.citizenship ?? "",
    secTinNumber: holder?.tinNumber ?? "",
    secLandline: holder?.landline ?? "",
    secOccupation: holder?.occupation ?? "",
    secBusinessIndustry: holder?.businessIndustry ?? "",
    secEmployedPosition: holder?.employedPosition ?? "",
    secOfficeAddress: holder?.officeAddress ? { ...holder.officeAddress } : { ...EMPTY_OFFICE },
    paymentSchemeId: customer?.paymentSchemeId ?? "",
    // A new application starts as Standard; Non-Standard stays selectable.
    contractClassification: customer ? customer.contractClassification ?? "" : "S",
    recommenderMemberId: customer?.referrerMemberId ?? customer?.recommenderMemberId ?? "",
    referrerMemberId: customer?.referrerMemberId ?? customer?.recommenderMemberId ?? "",
    referralReference: customer?.referralReference ?? "",
    acquisitionChannel: customer?.acquisitionChannel ?? "",
    // Saved numbers are fixed: editing them reopens the manual path.
    customerIdMode: customer?.status === "draft" && customer.customerIdMode
      ? customer.customerIdMode
      : customer?.customerNumber ? "manual" : "auto",
    customerNumber: customer?.customerNumber ?? "",
    ownerMemberId: customer?.ownerMemberId ?? "",
    consentDataPrivacy: customer?.consentDataPrivacy ?? false,
    idReceivedCertified: customer?.idReceivedCertified ?? false,
  };
}

export function toInput(draft: CustomerDraft, { saveAsDraft = false } = {}): CustomerDraftInput {
  const secondaryProfile = {
    firstName: draft.secFirstName.trim(),
    middleName: draft.secNoMiddleName ? null : draft.secMiddleName.trim() || null,
    noMiddleName: draft.secNoMiddleName,
    lastName: draft.secLastName.trim(),
    suffix: draft.secSuffix || null,
    gender: draft.secGender || null,
    civilStatus: draft.secCivilStatus || null,
    dateOfBirth: draft.secDateOfBirth || null,
    mobileNumber: draft.secMobileNumber ? normalizePhilippineMobile(draft.secMobileNumber) : null,
    email: draft.secEmail || null,
    address: draft.secAddress,
    governmentIdType: draft.secGovernmentIdType || null,
    governmentIdNumber: draft.secGovernmentIdNumber || null,
    citizenship: draft.secCitizenship.trim() || null,
    tinNumber: draft.secTinNumber.trim() || null,
    landline: draft.secLandline.trim() || null,
    occupation: draft.secOccupation.trim() || null,
    businessIndustry: draft.secBusinessIndustry.trim() || null,
    employedPosition: draft.secEmployedPosition.trim() || null,
    officeAddress: draft.secOfficeAddress,
  };
  const secondaryProfileStarted = Object.values(secondaryProfile).some((value) =>
    value && (typeof value !== "object" || Object.values(value).some(Boolean)),
  );
  // Built as an unannotated literal so the full holder profile flows through
  // at runtime (the landed SupplementaryHolder type is narrower than the
  // spec's sec mirror; see HolderSource). Non-literal assignment skips excess
  // property checks while every declared key stays type-checked.
  const input = {
    displayName: composeCustomerName({ firstName: draft.firstName, middleName: draft.noMiddleName ? "" : draft.middleName, lastName: draft.lastName, suffix: draft.suffix }),
    firstName: draft.firstName.trim(),
    middleName: draft.noMiddleName ? null : draft.middleName.trim() || null,
    noMiddleName: draft.noMiddleName,
    prefix: draft.prefix || null,
    lastName: draft.lastName.trim(),
    suffix: draft.suffix || null,
    gender: draft.gender || null,
    civilStatus: draft.civilStatus || null,
    dateOfBirth: draft.dateOfBirth || null,
    mobileNumber: draft.mobileNumber ? normalizePhilippineMobile(draft.mobileNumber) : null,
    email: draft.email || null,
    address: draft.address,
    governmentIdType: draft.governmentIdType || null,
    governmentIdNumber: draft.governmentIdNumber || null,
    citizenship: (draft.citizenshipCodes.length > 0 ? citizenshipLabels(draft.citizenshipCodes) : draft.citizenship.trim()) || null,
    citizenshipCodes: draft.citizenshipCodes.length > 0 ? draft.citizenshipCodes : null,
    tinNumber: draft.tinNumber.trim() || null,
    landline: draft.landline.trim() || null,
    occupation: draft.occupation.trim() || null,
    businessIndustry: draft.businessIndustry.trim() || null,
    employedPosition: draft.employedPosition.trim() || null,
    officeAddress: draft.officeAddress,
    vipPlan: (draft.vipPlan || null) as CustomerDraftInput["vipPlan"],
    supplementaryHolder:
      draft.secEnabled && (saveAsDraft || secondaryProfileStarted) ? secondaryProfile : null,
    paymentSchemeId: draft.paymentSchemeId || null,
    contractClassification: (draft.contractClassification || null) as CustomerDraftInput["contractClassification"],
    recommenderMemberId: draft.referrerMemberId || draft.recommenderMemberId || null,
    referrerMemberId: draft.referrerMemberId || draft.recommenderMemberId || null,
    referralReference: draft.referralReference.trim() || null,
    acquisitionChannel: (draft.acquisitionChannel || null) as AcquisitionChannel | null,
    customerIdMode: draft.customerIdMode,
    customerNumber: draft.customerIdMode === "manual" ? draft.customerNumber.trim() || null : null,
    consentDataPrivacy: draft.consentDataPrivacy,
    idReceivedCertified: draft.idReceivedCertified,
  };
  // The closing seller is chosen, never derived from the referrer (owner ruling R5). A blank draft may omit it.
  return draft.ownerMemberId ? { ...input, ownerMemberId: draft.ownerMemberId } : input;
}


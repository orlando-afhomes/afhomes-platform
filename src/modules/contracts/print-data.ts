import type { Customer, SupplementaryHolder } from "@/modules/customers/types";
import { buildScheduleState, netVerifiedCentavos, outstandingBalanceCentavos, totalVerifiedCentavos } from "@/modules/finance/rules";
import type { Payment } from "@/modules/finance/types";
import type { Contract } from "./types";

// shortcut: these prices and installments describe the supplied Grant templates, not live pricing. Update them and the templates together; print-data.test.ts fails if the configured four-month price drifts.
const TIERS = {
  B1: { name: "Bronze", slug: "bronze", grantPrice: 7_200_000, grantInstallment: 1_550_000 },
  S1: { name: "Silver", slug: "silver", grantPrice: 24_000_000, grantInstallment: 5_750_000 },
  G1: { name: "Gold", slug: "gold", grantPrice: 39_000_000, grantInstallment: 9_500_000 },
} as const;

export type TemplateKey = "application" | `${"reservation" | "grant"}-${"bronze" | "silver" | "gold"}`;
export type PrintContract = Pick<Contract, "productCode" | "status" | "classification" | "priceCentavos" | "schemeId" | "schemeLabel" | "schedule" | "vipNumber" | "createdAt" | "customerAccepted">;
export type SaleContacts = {
  director?: string;
  seniorManager?: string;
  manager?: string;
  referrer?: string;
  referrerPhone?: string | null;
  referrerEmail?: string | null;
};

export function supportedPrintTier(code: string) {
  return Object.hasOwn(TIERS, code) ? TIERS[code as keyof typeof TIERS] : null;
}

export function templateKeyFor(kind: "reservation" | "grant", contract: PrintContract): TemplateKey | null {
  const tier = supportedPrintTier(contract.productCode);
  if (!tier) return null;
  if (kind === "grant") {
    if (contract.classification !== "S" || contract.schemeId !== "scheme-installment-4m" || contract.priceCentavos !== tier.grantPrice) return null;
    const [reservation, ...installments] = contract.schedule;
    if (reservation?.purpose !== "reservation" || reservation.amountCentavos !== 1_000_000 || installments.length !== 4) return null;
    if (installments.some((line) => line.purpose !== "installment" || line.amountCentavos !== tier.grantInstallment)) return null;
  }
  return `${kind}-${tier.slug}`;
}

export function canPrintGrant(contract: PrintContract): boolean {
  return contract.status === "finalized" && Boolean(contract.vipNumber) && templateKeyFor("grant", contract) !== null;
}

export function firstPaymentSummary(contract: PrintContract, payments: readonly Payment[], date: string) {
  const approved = payments.filter((payment) => netVerifiedCentavos(payment) > 0);
  const lines = buildScheduleState(contract, approved, date);
  const allocated = (purpose: "reservation" | "down_payment") =>
    contract.schedule.filter((item) => item.purpose === purpose).reduce(
      (sum, item) => sum + (lines.find((line) => line.seq === item.seq)?.allocatedCentavos ?? 0), 0,
    );
  return {
    approved,
    received: totalVerifiedCentavos(approved),
    balance: outstandingBalanceCentavos(contract, approved),
    reservationReceived: allocated("reservation"),
    downPaymentReceived: allocated("down_payment"),
  };
}

export type PrintCustomer = Pick<Customer, "displayName" | "firstName" | "middleName" | "lastName" | "noMiddleName" | "suffix" | "dateOfBirth" | "gender" | "citizenship" | "civilStatus" | "address" | "landline" | "mobileNumber" | "email" | "tinNumber" | "occupation" | "businessIndustry" | "employedPosition" | "officeAddress" | "supplementaryHolder" | "acquisitionChannel">;
type PrintHolder = Omit<PrintCustomer, "displayName" | "supplementaryHolder" | "acquisitionChannel"> & { displayName?: string };

export function printCustomerData(customer: PrintCustomer): PrintCustomer {
  const holder = (input: PrintHolder) => {
    const { firstName, middleName, lastName, noMiddleName, suffix, dateOfBirth, gender, citizenship, civilStatus, address, landline, mobileNumber, email, tinNumber, occupation, businessIndustry, employedPosition, officeAddress } = input;
    return { firstName, middleName, lastName, noMiddleName, suffix, dateOfBirth, gender, citizenship, civilStatus, address, landline, mobileNumber, email, tinNumber, occupation, businessIndustry, employedPosition, officeAddress };
  };
  const secondary = customer.supplementaryHolder;
  return {
    ...holder(customer), displayName: customer.displayName, acquisitionChannel: customer.acquisitionChannel,
    supplementaryHolder: secondary ? {
      ...holder(secondary), firstName: secondary.firstName, lastName: secondary.lastName,
      middleName: secondary.middleName, suffix: secondary.suffix, gender: secondary.gender, dateOfBirth: secondary.dateOfBirth,
    } : secondary,
  };
}

export function printHolderName(holder: PrintHolder | SupplementaryHolder, surnameFirst = false) {
  const given = [holder.firstName, holder.noMiddleName ? null : holder.middleName, surnameFirst ? null : holder.lastName, holder.suffix].filter(Boolean).join(" ");
  if (surnameFirst && holder.lastName && given) return `${holder.lastName}, ${given}`;
  return given || holder.lastName || ("displayName" in holder ? holder.displayName ?? "" : "");
}

export function printHomeAddress(holder: PrintHolder) {
  const address = holder.address;
  return address ? [address.street, address.barangay, address.city, address.province, address.postalCode].filter(Boolean).join(", ") : "";
}

export type PrintDocumentInput =
  | { kind: "application"; customer: PrintCustomer; tierCode: string; priceCentavos: number; schemeLabel: string; contacts: SaleContacts; date: string }
  | { kind: "reservation" | "grant"; contract: PrintContract; customer: PrintCustomer; contacts: SaleContacts; payments: readonly Payment[]; date: string }
  | { kind: "finance"; contract: PrintContract; customerName: string; payments: readonly Payment[]; date: string };

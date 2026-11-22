import type { CardHolder } from "@/data/contracts/member-qr-repository";
import type { PromoBalance } from "@/modules/promos/types";

/** Contact Information only (doc 04 section 7.5); identity and card data stay read-only. */
export type PortalContactInput = {
  mobileNumber: string;
  email: string;
  landline: string;
};

export type PortalMembership = {
  id: string;
  productCode: string;
  tierName: string;
  cardId: string | null;
  status: string;
  activationDate: string | null;
  validityEndDate: string | null;
  financialHold: boolean;
};

export type PortalQr = {
  holder: CardHolder;
  holderName: string;
  vipNumber: string;
  code: string;
};

export type PortalActivityKind = "promo" | "stay" | "booking" | "bill";
export type PortalActivity = {
  id: string;
  date: string;
  kind: PortalActivityKind;
  label: string;
  detail: string | null;
  points: number | null;
  direction: "credit" | "debit" | "info";
  reference: string | null;
};

export type PortalOverview = {
  customer: {
    id: string;
    displayName: string;
    customerNumber: string | null;
    firstName: string | null;
    lastName: string | null;
    mobileNumber: string;
    email: string;
    landline: string;
    /** The customer's own profile picture (data URL), or null. */
    photoUrl: string | null;
  };
  memberships: PortalMembership[];
  membership: PortalMembership;
  promo: {
    total: PromoBalance;
    byPromo: Array<{ promoId: string; promoName: string; balance: PromoBalance }>;
  };
  stay: {
    spendableWeekday: number;
    spendableWeekend: number;
    released: number;
    reserved: number;
    redeemed: number;
  } | null;
  qr: PortalQr[];
  activity: PortalActivity[];
};

export type PortalCustomer = {
  id: string;
  displayName: string;
  email: string;
};

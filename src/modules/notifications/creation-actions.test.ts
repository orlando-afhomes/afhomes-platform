import { describe, expect, it } from "vitest";
import { AUDIT_MODULES, type AuditModule } from "@/modules/audit/types";
import { CREATION_ACTIONS, isCreationEvent } from "./creation-actions";

/** Locked badge content: red navlink badges count only these brand-new-record actions. */
const LOCKED: Readonly<Record<AuditModule, readonly string[]>> = {
  organization: ["ACCOUNT_CREATED", "STAFF_CREATED", "ROLE_CREATED", "DEPARTMENT_CREATED"],
  "sales-network": ["MEMBER_CREATED", "SELLER_CREATED"],
  accreditation: ["ACCREDITATION_ISSUED", "REGISTRATION_SUBMITTED", "JAD_ACCREDITATION_RECORDED"],
  customers: ["CUSTOMER_DRAFT_CREATED", "CUSTOMER_SUBMITTED", "CUSTOMER_IMPORT_COMPLETED"],
  "vip-products": ["PAYMENT_SCHEME_CREATED"],
  contracts: ["CONTRACT_PREPARED", "CONTRACT_RA_RECORDED"],
  finance: ["PAYMENT_SUBMITTED", "RECEIPT_IMPORT_CREATED", "MONTH_CLOSED"],
  sales: ["SALE_RECORDED", "IGP_SERIES_ISSUED"],
  commissions: ["COMMISSION_RELEASED"],
  membership: ["MEMBERSHIP_CREATED"],
  "stay-points": [
    "RESORT_BILL_ENTERED",
    "REDEMPTION_BOOKING_CREATED",
    "REDEMPTION_TABLE_VERSION_PUBLISHED",
    "REDEMPTION_HOLIDAY_ADDED",
    "COMPASSIONATE_WAIVER_REQUESTED",
  ],
};

describe("CREATION_ACTIONS", () => {
  it("covers every audit module with exactly the locked content", () => {
    expect(Object.keys(CREATION_ACTIONS).sort()).toEqual([...AUDIT_MODULES].sort());
    for (const auditModule of AUDIT_MODULES) {
      expect(CREATION_ACTIONS[auditModule]).toEqual(LOCKED[auditModule]);
    }
  });
});

describe("isCreationEvent", () => {
  it("returns true for locked creation actions", () => {
    expect(isCreationEvent("organization", "DEPARTMENT_CREATED")).toBe(true);
    expect(isCreationEvent("sales", "IGP_SERIES_ISSUED")).toBe(true);
    expect(isCreationEvent("stay-points", "COMPASSIONATE_WAIVER_REQUESTED")).toBe(true);
  });

  it("returns false for non-creation actions and unknown actions", () => {
    expect(isCreationEvent("organization", "ACCOUNT_STATUS_CHANGED")).toBe(false);
    expect(isCreationEvent("finance", "PAYMENT_VERIFIED")).toBe(false);
    expect(isCreationEvent("sales", "NO_SUCH_ACTION")).toBe(false);
  });
});

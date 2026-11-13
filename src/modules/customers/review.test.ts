import { describe, expect, it } from "vitest";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import { approvalErrors, canReviewRegistration, isEditableRegistration } from "./review";

const baseRecord = (overrides: Partial<AccreditationRecord>): AccreditationRecord =>
  ({ id: "acc-1", memberId: "mem-1", adminStatus: "active", effectiveDate: "2026-01-01", expiryDate: "2027-01-01", ...overrides }) as AccreditationRecord;

describe("registration review rules (doc 04 sections 5 and 10)", () => {
  it("lets only a submitted registration be reviewed", () => {
    expect(canReviewRegistration("submitted")).toBe(true);
    for (const status of ["draft", "approved", "sent_back", "rejected", "active_member", "inactive"] as const) expect(canReviewRegistration(status)).toBe(false);
  });

  it("edits directly only drafts and registrations sent back", () => {
    expect(isEditableRegistration("draft")).toBe(true);
    expect(isEditableRegistration("sent_back")).toBe(true);
    expect(isEditableRegistration("submitted")).toBe(false);
  });

  it("refuses approval without a closing seller", () => {
    expect(approvalErrors({ ownerMemberId: null }, [], "2026-11-13")).toHaveProperty("ownerMemberId");
  });

  it("refuses a suspended closing seller but accepts an expired one", () => {
    const suspended = baseRecord({ adminStatus: "suspended", suspensionEffectiveDate: "2026-06-01" });
    expect(approvalErrors({ ownerMemberId: "mem-1" }, [suspended], "2026-11-13")).toHaveProperty("ownerMemberId");
    const expired = baseRecord({ expiryDate: "2026-10-01" });
    expect(approvalErrors({ ownerMemberId: "mem-1" }, [expired], "2026-11-13")).toEqual({});
  });

  it("needs a dated referral reference when the closing seller is also the referrer", () => {
    const same = { ownerMemberId: "mem-1", referrerMemberId: "mem-1" };
    expect(approvalErrors(same, [], "2026-11-13")).toHaveProperty("referralReference");
    expect(approvalErrors({ ...same, referralReference: "  " }, [], "2026-11-13")).toHaveProperty("referralReference");
    expect(approvalErrors({ ...same, referralReference: "FB lead 2026-10-30" }, [], "2026-11-13")).toEqual({});
    expect(approvalErrors({ ownerMemberId: "mem-1", referrerMemberId: "mem-2" }, [], "2026-11-13")).toEqual({});
  });
});

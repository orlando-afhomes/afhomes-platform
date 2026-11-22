import { describe, expect, it } from "vitest";
import { RETENTION_SCHEDULE, retentionDisposalDate } from "./retention";

describe("records retention schedule", () => {
  it("counts finance records from the end of the calendar year of the transaction", () => {
    expect(retentionDisposalDate("finance", "2026-03-15")).toBe("2036-12-31");
    expect(retentionDisposalDate("finance", "2026-12-31")).toBe("2036-12-31");
  });

  it("counts the other classes from their own start date", () => {
    expect(retentionDisposalDate("audit", "2026-11-22")).toBe("2036-11-22");
    expect(retentionDisposalDate("rejected_application", "2026-11-22")).toBe("2028-11-22");
    expect(retentionDisposalDate("verify_log", "2028-02-29")).toBe("2029-02-28");
  });

  it("never disposes under a legal hold, of marketing consent, or from an invalid date", () => {
    expect(retentionDisposalDate("contracts", "2026-11-22", true)).toBeNull();
    expect(retentionDisposalDate("marketing", "2026-11-22")).toBeNull();
    expect(retentionDisposalDate("audit", "2026-02-30")).toBeNull();
  });

  it("lists every class once", () => {
    expect(new Set(RETENTION_SCHEDULE.map(({ id }) => id)).size).toBe(RETENTION_SCHEDULE.length);
  });
});

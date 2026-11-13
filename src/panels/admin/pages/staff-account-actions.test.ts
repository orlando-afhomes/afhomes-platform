import { describe, expect, it, vi } from "vitest";
import { LINKED_ACCOUNT_ACTION_LABELS, confirmLinkedAccountStatus, linkedAccountActions } from "./staff-account-actions";

describe("linked account actions for Staff holders (A4)", () => {
  it("keeps activate, suspend and deactivate, and drops other statuses", () => {
    expect(linkedAccountActions(["active", "suspended", "deactivated", "pending"])).toEqual(["active", "suspended", "deactivated"]);
    expect(LINKED_ACCOUNT_ACTION_LABELS.active).toBe("Activate account");
  });

  it("confirms activation without the danger style or the old Administrator-only text", () => {
    const confirmRun = vi.fn();
    confirmLinkedAccountStatus(confirmRun, "Admin User", "active", async () => {});
    const input = confirmRun.mock.calls[0][0];
    expect(input.danger).toBe(false);
    expect(input.description).not.toMatch(/only an administrator/i);
  });

  it("tells HR the suspended account can be turned back on", () => {
    const confirmRun = vi.fn();
    confirmLinkedAccountStatus(confirmRun, "Admin User", "suspended", async () => {});
    const input = confirmRun.mock.calls[0][0];
    expect(input.danger).toBe(true);
    expect(input.description).not.toMatch(/only an administrator/i);
  });
});

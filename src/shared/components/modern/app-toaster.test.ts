import { describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), message: vi.fn() } }));

import { toast } from "sonner";
import { failureReason, notify } from "./app-toaster";

describe("failureReason", () => {
  it("joins the field messages and skips empty ones", () => {
    const failure = Object.assign(new Error("Review the highlighted fields."), {
      errors: {
        firstName: "First name is required.",
        email: undefined,
        ownerMemberId: "Choose the closing seller so the branch can be set.",
      },
    });
    expect(failureReason(failure)).toBe("First name is required. Choose the closing seller so the branch can be set.");
  });

  it("does not repeat a generic validation summary", () => {
    expect(failureReason({ errors: {} })).toBeUndefined();
    expect(failureReason(new Error("Review the highlighted fields."))).toBeUndefined();
    expect(failureReason(new Error("Check the highlighted fields."))).toBeUndefined();
  });

  it("keeps a specific server message", () => {
    expect(failureReason(new Error("Choose the closing seller so the branch can be set."))).toBe("Choose the closing seller so the branch can be set.");
  });

  it("explains a network failure in plain words", () => {
    expect(failureReason(new TypeError("Failed to fetch"))).toBe("Could not reach the server. Check your connection and try again.");
  });

  it("ignores values that are not errors", () => {
    expect(failureReason(undefined)).toBeUndefined();
    expect(failureReason("nope")).toBeUndefined();
  });
});

describe("notify.actionError", () => {
  it("titles the toast with the action and describes the real reason", () => {
    notify.actionError(new Error("Choose the closing seller so the branch can be set."), "Save failed.");
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Save failed.", expect.objectContaining({ description: "Choose the closing seller so the branch can be set." }));
  });

  it("shows only the action when no reason is available", () => {
    vi.mocked(toast.error).mockClear();
    notify.actionError(undefined, "Save failed.");
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Save failed.", { duration: 8000 });
  });
});

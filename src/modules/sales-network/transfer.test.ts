import { describe, expect, it } from "vitest";
import { initialTransferSelection, transferPositionOptions } from "./transfer";

describe("transfer designation authority", () => {
  it("locks the current designation without Accounts authority", () => {
    expect(initialTransferSelection("OST", false)).toEqual({ target: "OST", position: "OST" });
    expect(initialTransferSelection("SM", false)).toEqual({ target: "IST", position: "SM" });
    expect(transferPositionOptions("OST", "OST", false)).toEqual([{ value: "OST", label: "Outsourced Seller (OST)" }]);
    expect(transferPositionOptions("SSM", "IST", false)).toEqual([{ value: "SSM", label: "Senior Sales Manager" }]);
  });

  it("offers the promotion choices with Accounts authority", () => {
    expect(initialTransferSelection("OST", true)).toEqual({ target: "IST", position: "SSM" });
    expect(transferPositionOptions("OST", "IST", true).map((option) => option.value)).toEqual(["SVD", "SSM", "SM"]);
    expect(transferPositionOptions("OST", "OST", true).map((option) => option.value)).toEqual(["OST"]);
  });

  it("keeps an IST member on its current designation unless it is demoted", () => {
    expect(initialTransferSelection("SM", true)).toEqual({ target: "OST", position: "OST" });
    expect(transferPositionOptions("SM", "IST", true).map((option) => option.value)).toEqual(["SM"]);
  });
});

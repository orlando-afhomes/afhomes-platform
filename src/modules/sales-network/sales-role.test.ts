import { describe, expect, it } from "vitest";
import { salesRoleForDesignation } from "./sales-role";

describe("salesRoleForDesignation", () => {
  it("maps every sales position to its system role", () => {
    expect(salesRoleForDesignation("SVD")).toBe("svd");
    expect(salesRoleForDesignation("SSM")).toBe("ssm");
    expect(salesRoleForDesignation("SM")).toBe("sm");
    expect(salesRoleForDesignation("OST")).toBe("ost");
  });
});

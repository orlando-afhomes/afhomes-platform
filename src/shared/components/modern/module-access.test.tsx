import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ModuleAccessList } from "./module-access";

afterEach(cleanup);

describe("ModuleAccessList", () => {
  it("shows granted modules and hides the rest by default", () => {
    render(<ModuleAccessList moduleIds={["dashboard", "customers"]} label="Access" />);
    const organization = screen.getByRole("region", { name: "Organization" });
    expect(organization).toHaveTextContent("Dashboard");
    expect(organization).not.toHaveTextContent("Departments");
    expect(screen.queryByRole("region", { name: "Finance" })).toBeNull();
  });

  it("shows every module with its granted state when showAll is set", () => {
    render(<ModuleAccessList moduleIds={["dashboard", "customers"]} showAll label="Access" />);
    const finance = screen.getByRole("region", { name: "Finance" });
    expect(finance).toHaveTextContent("Commissions");
    expect(finance).toHaveTextContent("not granted");
    const organization = screen.getByRole("region", { name: "Organization" });
    expect(organization).toHaveTextContent("Dashboard");
    expect(organization).toHaveTextContent("granted");
  });

  it("keeps stored grants outside the catalog visible", () => {
    render(<ModuleAccessList moduleIds={["legacy-module"]} label="Access" />);
    expect(screen.getByRole("region", { name: "Other stored grants" })).toHaveTextContent("Legacy Module");
  });

  it("renders an empty message when nothing is granted", () => {
    render(<ModuleAccessList moduleIds={[]} label="Access" />);
    expect(screen.getByText("No modules granted.")).toBeTruthy();
  });
});

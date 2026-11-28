import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Customer } from "@/modules/customers/types";
import { CustomerInfoCard } from "./customer-detail-panels";

afterEach(cleanup);

const customer = {
  id: "c-1",
  displayName: "Juan Dela Cruz",
  branchId: "branch-1",
  ownerMemberId: null,
  status: "draft",
  governmentIdType: "Philippine National ID",
  governmentIdNumber: "1234-5678-9012-3456",
} as Customer;

describe("CustomerInfoCard", () => {
  it("masks the full government ID number on the customer record", () => {
    render(<CustomerInfoCard customer={customer} vipPlanName={null} ownerName="—" recommenderName="—" />);
    expect(screen.queryByText("1234-5678-9012-3456")).toBeNull();
    expect(screen.getByText(/••••3456/)).toBeInTheDocument();
  });
});

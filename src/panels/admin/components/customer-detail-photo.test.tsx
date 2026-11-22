import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { currentCardHolders } from "@/data/mock/member-qr-repository";
import { createMockStore } from "@/data/mock/seed";
import type { Customer } from "@/modules/customers/types";
import { CustomerInfoCard } from "./customer-detail-panels";

afterEach(cleanup);

const base: Customer = { id: "cust-x", displayName: "Customer X", branchId: "branch-a", ownerMemberId: null, status: "approved" };
const PHOTO = { dataUrl: "data:image/png;base64,aGVsbG8=", fileName: "me.png" };

it("shows the customer's own profile picture on the staff customer record", () => {
  render(<CustomerInfoCard customer={{ ...base, profilePhoto: PHOTO }} vipPlanName={null} ownerName="Company" recommenderName="—" />);
  // The avatar image only mounts once the browser has loaded it, so jsdom shows the block and the initials fallback.
  expect(screen.getByText("Profile picture uploaded by the customer")).toBeInTheDocument();
  expect(screen.getByText("CU")).toBeInTheDocument();
});

it("shows no picture block when the customer has not uploaded one", () => {
  render(<CustomerInfoCard customer={base} vipPlanName={null} ownerName="Company" recommenderName="—" />);
  expect(screen.queryByText("Profile picture uploaded by the customer")).toBeNull();
});

it("gives the counter QR lookup the primary holder's picture only", () => {
  const store = createMockStore();
  const customer = store.customers.find((item) => item.id === "cust-b1")!;
  customer.profilePhoto = PHOTO;
  const [primary] = currentCardHolders(store, "memb-1");
  expect(primary.info).toMatchObject({ holder: "primary", photoUrl: PHOTO.dataUrl });
  customer.profilePhoto = null;
  expect(currentCardHolders(store, "memb-1")[0].info.photoUrl).toBeNull();
});

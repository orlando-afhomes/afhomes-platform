import { describe, expect, it } from "vitest";
import { validateAccreditedSellerFields, type CreateAccreditedSellerInput } from "./accredited-seller";

function validSeller(overrides: Partial<CreateAccreditedSellerInput> = {}): CreateAccreditedSellerInput {
  return {
    mode: "OST",
    sellerIdentity: "new",
    firstName: "Faye",
    middleName: "",
    noMiddleName: true,
    lastName: "Seller",
    suffix: null,
    mobileNumber: "09170000001",
    dateOfBirth: "1990-01-01",
    email: "faye.seller@example.com",
    tempPassword: "Tmp-123456789012",
    confirmPassword: "Tmp-123456789012",
    profilePhotoName: null,
    street: "1 Test Street",
    province: "Laguna",
    city: "Calamba City",
    barangay: "Banlic",
    postalCode: "4027",
    designation: "OST",
    teamName: null,
    parentId: "00000000-0000-0000-0000-000000000000",
    cardApplicationDate: "2026-11-01",
    programCategory: "non_vip_client",
    vipCardLevel: "B1",
    gender: "Male",
    civilStatus: "Single",
    governmentIdType: "Passport",
    governmentIdNumber: "P1234567",
    approvedStart: "2026-01-01",
    accreditationStatus: "pending",
    aaMethod: "automatic",
    ...overrides,
  };
}

describe("validateAccreditedSellerFields", () => {
  it("accepts a seller without a profile photo", () => {
    expect(validateAccreditedSellerFields(validSeller({ profilePhotoName: null }), ["non_vip_client"])).toBeNull();
  });

  it("validates the ID number against the selected type", () => {
    const error = validateAccreditedSellerFields(validSeller({
      governmentIdType: "Digital National ID",
      governmentIdNumber: "AB12CD",
    }), ["non_vip_client"]);
    expect(error).toBe("Enter a valid Digital National ID (16-digit National ID Card Number).");
  });
});

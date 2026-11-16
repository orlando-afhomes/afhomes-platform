import { describe, expect, it } from "vitest";
import { buildContactMailto, EMPTY_CONTACT_MESSAGE, validateContactMessage } from "./contact-message";

const VALID = { name: "Pedro Reyes", email: "pedro@example.com", phone: "09171234567", subject: "VIP card", message: "Hello & thanks" };

describe("contact message", () => {
  it("accepts a complete message and treats the message text as optional", () => {
    expect(validateContactMessage(VALID)).toEqual({});
    expect(validateContactMessage({ ...VALID, message: "" })).toEqual({});
  });

  it("reports each bad field", () => {
    const errors = validateContactMessage({ ...EMPTY_CONTACT_MESSAGE, email: "nope", phone: "123" });
    expect(Object.keys(errors).sort()).toEqual(["email", "name", "phone", "subject"]);
  });

  it("builds an encoded mailto link to the company email", () => {
    const link = buildContactMailto(VALID);
    expect(link.startsWith("mailto:info@afhomes.com.ph?subject=VIP%20card&body=")).toBe(true);
    expect(decodeURIComponent(link.split("&body=")[1])).toContain("Hello & thanks");
    expect(decodeURIComponent(link.split("&body=")[1])).toContain("Contact number: 09171234567");
  });
});

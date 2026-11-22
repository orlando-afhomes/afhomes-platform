import { expect, it } from "vitest";
import { PROFILE_IMAGE_MAX_BYTES, validateProfileImageDataUrl, validateProfileImageFile } from "./image";

/** A data URL whose decoded size is exactly `bytes` (base64 groups of 3 bytes; a short tail adds "=" padding). */
const dataUrlOf = (bytes: number) => {
  const full = Math.floor(bytes / 3);
  const rest = bytes % 3;
  return `data:image/png;base64,${"A".repeat(full * 4)}${rest === 0 ? "" : rest === 1 ? "AA==" : "AAA="}`;
};

it("accepts a file exactly at the 2MB limit and rejects one byte more, in the picker and when saving", () => {
  expect(validateProfileImageFile({ type: "image/png", size: PROFILE_IMAGE_MAX_BYTES })).toBeNull();
  expect(validateProfileImageFile({ type: "image/png", size: PROFILE_IMAGE_MAX_BYTES + 1 })).toBe("Image must be 2MB or smaller.");
  expect(validateProfileImageDataUrl(dataUrlOf(PROFILE_IMAGE_MAX_BYTES))).toBeNull();
  expect(validateProfileImageDataUrl(dataUrlOf(PROFILE_IMAGE_MAX_BYTES + 1))).toBe("Image must be 2MB or smaller.");
});

it("rejects an empty or badly padded image body", () => {
  for (const body of ["", "====", "A", "AB", "ABC", "AB=A", "A===", "AAAA=", "AA==AAAA"]) {
    expect(validateProfileImageDataUrl(`data:image/png;base64,${body}`)).toBe("Unsupported image format.");
  }
  for (const body of ["AAAA", "AA==", "AAA=", "AAAAAAA=", "QUJD"]) {
    expect(validateProfileImageDataUrl(`data:image/png;base64,${body}`)).toBeNull();
  }
});

it("rejects data that is not an image", () => {
  expect(validateProfileImageDataUrl("data:text/html;base64,aGk=")).toBe("Unsupported image format.");
});

// @vitest-environment node
import { describe, expect, it } from "vitest";
import { detectAvatarType, detectEvidenceType, mergeStaffProfile, staffAvatarFileOf } from "./storage";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=", "base64");

describe("receipt evidence type detection", () => {
  it("accepts JPEG, PNG and PDF bytes and refuses anything else", () => {
    expect(detectEvidenceType(PNG)).toBe("image/png");
    expect(detectEvidenceType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectEvidenceType(Buffer.from("%PDF-1.7", "latin1"))).toBe("application/pdf");
    expect(detectEvidenceType(Buffer.from("<html>not a receipt</html>"))).toBeNull();
    expect(detectEvidenceType(Buffer.alloc(0))).toBeNull();
  });
});

describe("staff avatar storage", () => {
  it("detects JPEG, PNG and WebP bytes, and refuses other files", () => {
    const webp = Buffer.concat([Buffer.from("RIFF", "latin1"), Buffer.alloc(4), Buffer.from("WEBP", "latin1"), Buffer.alloc(8)]);
    expect(detectAvatarType(PNG)).toBe("image/png");
    expect(detectAvatarType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectAvatarType(webp)).toBe("image/webp");
    expect(detectAvatarType(Buffer.from("<html>not an image</html>"))).toBeNull();
  });

  it("reads avatar metadata only from a complete stored record", () => {
    const meta = { fileId: "f1", storagePath: "staff/s1/avatar/f1.png", fileName: "me.png", size: 10, contentType: "image/png", uploadedAt: "2026-01-01", uploadedBy: "u1" };
    expect(staffAvatarFileOf({ avatarFile: meta })).toEqual(meta);
    expect(staffAvatarFileOf({ avatarFile: { fileId: "f1" } })).toBeNull();
    expect(staffAvatarFileOf(null)).toBeNull();
  });

  it("keeps the private avatar metadata across an ordinary profile save", () => {
    const meta = { fileId: "f1", storagePath: "staff/s1/avatar/f1.png", fileName: "me.png", size: 10, contentType: "image/png", uploadedAt: "2026-01-01", uploadedBy: "u1" };
    const url = "/api/v1/staff/s1/avatar/f1";
    const merged = mergeStaffProfile({ firstName: "Ana", avatarUrl: url, avatarFile: meta }, { firstName: "Ana Maria", governmentIdNumber: "AB12CD" }, url);
    expect(merged).toMatchObject({ firstName: "Ana Maria", governmentIdNumber: "AB12CD", avatarUrl: url, avatarFile: meta });
  });

  it("clears the avatar metadata only when the avatar is removed", () => {
    const meta = { fileId: "f1", storagePath: "staff/s1/avatar/f1.png", fileName: "me.png", size: 10, contentType: "image/png", uploadedAt: "2026-01-01", uploadedBy: "u1" };
    const merged = mergeStaffProfile({ firstName: "Ana", avatarUrl: "/api/v1/staff/s1/avatar/f1", avatarFile: meta }, { firstName: "Ana" }, null);
    expect(merged).toMatchObject({ firstName: "Ana", avatarUrl: null });
    expect(merged).not.toHaveProperty("avatarFile");
  });
});

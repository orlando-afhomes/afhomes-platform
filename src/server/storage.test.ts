// @vitest-environment node
import { describe, expect, it } from "vitest";
import { detectEvidenceType } from "./storage";

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

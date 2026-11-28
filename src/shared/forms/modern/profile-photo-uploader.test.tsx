import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilePhotoUploader } from "./profile-photo-uploader";

beforeEach(() => {
  vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia: vi.fn().mockRejectedValue({ name: "NotAllowedError" }) } });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ProfilePhotoUploader", () => {
  it("offers both Upload Photo and Take Picture for image uploads", async () => {
    render(<ProfilePhotoUploader value={null} onSelect={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByRole("button", { name: /upload profile photo/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /take picture/i }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Take a picture");
  });

  it("does not offer Take Picture for a PDF-only upload", () => {
    render(<ProfilePhotoUploader value={null} onSelect={vi.fn()} onClear={vi.fn()} accept="application/pdf" />);
    expect(screen.queryByRole("button", { name: /take picture/i })).toBeNull();
  });
});

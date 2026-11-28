import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CameraCaptureDialog, TakePictureButton } from "./camera-capture-dialog";

const stop = vi.fn();
const getUserMedia = vi.fn();

beforeEach(() => {
  stop.mockReset();
  getUserMedia.mockReset();
  vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia } });
  Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
  Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, get: () => 1920 });
  Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { configurable: true, get: () => 1080 });
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { configurable: true, value: () => ({ drawImage: vi.fn() }) });
  Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
    configurable: true,
    value: (callback: BlobCallback) => callback(new Blob(["camera"], { type: "image/jpeg" })),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CameraCaptureDialog", () => {
  it("explains a denied camera permission and leaves the upload fallback visible", async () => {
    getUserMedia.mockRejectedValue({ name: "NotAllowedError" });
    render(<CameraCaptureDialog open onClose={vi.fn()} onCapture={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Camera permission was denied");
    expect(screen.getAllByText(/upload a file instead/i).length).toBeGreaterThan(0);
  });

  it("blurs and dims the overlay and centers the starting spinner", async () => {
    getUserMedia.mockReturnValue(new Promise(() => undefined));
    render(<CameraCaptureDialog open onClose={vi.fn()} onCapture={vi.fn()} />);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay?.className).toContain("tw:backdrop-blur-sm");
    expect(overlay?.className).toContain("tw:bg-black/35");

    const spinner = screen.getByLabelText("Starting camera");
    expect(spinner.parentElement?.className).toContain("tw:absolute");
    expect(spinner.parentElement?.className).toContain("tw:place-items-center");
  });

  it("captures a JPEG file, stops the camera, and closes", async () => {
    getUserMedia.mockResolvedValue({ getTracks: () => [{ stop }] });
    const onCapture = vi.fn();
    const onClose = vi.fn();
    render(<CameraCaptureDialog open onClose={onClose} onCapture={onCapture} />);
    const captureButton = await screen.findByRole("button", { name: "Capture photo" });
    await waitFor(() => expect(captureButton).toBeEnabled());
    await userEvent.click(captureButton);
    await waitFor(() => expect(onCapture).toHaveBeenCalledTimes(1));
    const file = onCapture.mock.calls[0][0] as File;
    expect(file.type).toBe("image/jpeg");
    expect(file.name).toMatch(/^camera-.*\.jpg$/);
    expect(stop).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("stops the camera when cancelled", async () => {
    getUserMedia.mockResolvedValue({ getTracks: () => [{ stop }] });
    const onClose = vi.fn();
    render(<CameraCaptureDialog open onClose={onClose} onCapture={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(stop).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

describe("TakePictureButton", () => {
  it("opens the camera dialog from a non-submitting button", async () => {
    getUserMedia.mockRejectedValue({ name: "NotAllowedError" });
    render(<TakePictureButton onCapture={vi.fn()} />);
    const button = screen.getByRole("button", { name: /take picture/i });
    expect(button).toHaveAttribute("type", "button");
    await userEvent.click(button);
    expect(await screen.findByRole("dialog")).toHaveTextContent("Take a picture");
  });
});

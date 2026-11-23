import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ScanMemberQrButton } from "./member-qr";

const camera = vi.hoisted(() => ({ decode: vi.fn(), decodeImage: vi.fn(), resolve: vi.fn() }));

vi.mock("@zxing/browser", () => ({
  BrowserQRCodeReader: class { decodeFromConstraints = camera.decode; decodeFromImageUrl = camera.decodeImage; },
}));
vi.mock("@/data/business-queries", () => ({ useOperation: () => true }));
vi.mock("@/data/queries", () => {
  const repositories = { memberQr: { resolve: camera.resolve } };
  return { useMockRepositories: () => repositories };
});

afterEach(() => {
  cleanup();
  camera.decode.mockReset();
  camera.decodeImage.mockReset();
  camera.resolve.mockReset();
  vi.unstubAllGlobals();
});

function availableCamera() {
  vi.stubGlobal("navigator", Object.create(window.navigator, { mediaDevices: { value: { getUserMedia: vi.fn() } } }));
}

it("opens the camera on demand, resolves a repeated scan once, and stops the camera", async () => {
  availableCamera();
  const holder = { membershipId: "member-1", holder: "primary" };
  const onSelect = vi.fn();
  const stop = vi.fn();
  camera.resolve.mockResolvedValue(holder);
  camera.decode.mockImplementation(async (_constraints, _video, callback) => {
    const result = { getText: () => "sample-code" };
    callback(result, undefined, { stop });
    callback(result, undefined, { stop });
    return { stop };
  });
  const user = userEvent.setup();
  render(<ScanMemberQrButton onSelect={onSelect} />);
  expect(camera.decode).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Scan QR" }));
  await waitFor(() => expect(onSelect).toHaveBeenCalledWith(holder));
  expect(camera.resolve).toHaveBeenCalledTimes(1);
  expect(stop).toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("offers manual lookup when the camera is denied", async () => {
  availableCamera();
  camera.decode.mockRejectedValue(new Error("Permission denied"));
  const user = userEvent.setup();
  render(<ScanMemberQrButton onSelect={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "Scan QR" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Camera unavailable");
  await user.click(screen.getByRole("button", { name: "Use manual lookup" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("reads an uploaded QR image like a scan, and explains an image with no QR", async () => {
  availableCamera();
  camera.decode.mockResolvedValue({ stop: vi.fn() });
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:qr", revokeObjectURL: vi.fn() }));
  const holder = { membershipId: "member-1", holder: "primary" };
  const onSelect = vi.fn();
  camera.resolve.mockResolvedValue(holder);
  camera.decodeImage.mockResolvedValueOnce({ getText: () => "sample-code" }).mockRejectedValueOnce(new Error("not found"));
  const user = userEvent.setup();
  render(<ScanMemberQrButton onSelect={onSelect} />);
  await user.click(screen.getByRole("button", { name: "Scan QR" }));
  const picture = new File(["x"], "qr.png", { type: "image/png" });
  await user.upload(await screen.findByLabelText("QR image file"), picture);
  await waitFor(() => expect(onSelect).toHaveBeenCalledWith(holder));
  expect(camera.resolve).toHaveBeenCalledWith("sample-code");

  render(<ScanMemberQrButton onSelect={vi.fn()} />);
  await user.click(screen.getAllByRole("button", { name: "Scan QR" })[0]);
  await user.upload(await screen.findByLabelText("QR image file"), picture);
  expect(await screen.findByRole("alert")).toHaveTextContent("No QR code found");
});

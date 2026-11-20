import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ImagePreview } from "./image-preview";

const PNG = "data:image/png;base64,Zml4dHVyZQ==";

afterEach(cleanup);

describe("ImagePreview", () => {
  it("opens the full-size image from the thumbnail and closes the viewer", async () => {
    const user = userEvent.setup();
    render(<ImagePreview src={PNG} fileName="id.png" label="Government ID image" />);

    await user.click(screen.getByRole("button", { name: "View Government ID image full size" }));
    const dialog = await screen.findByRole("dialog", { name: "Government ID image" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Government ID image" })).toHaveAttribute("src", PNG);

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens a PDF evidence file in a new tab", () => {
    render(<ImagePreview src="data:application/pdf;base64,Zml4dHVyZQ==" fileName="receipt.pdf" label="Receipt file" />);
    const link = screen.getByRole("link", { name: "receipt.pdf" });
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("falls back to the stored file name when no file data is kept", () => {
    render(<ImagePreview src={null} fileName="seed-receipt.jpg" label="Receipt file" />);
    expect(screen.getByText("seed-receipt.jpg")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

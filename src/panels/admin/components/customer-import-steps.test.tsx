import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UploadDropzone } from "./customer-import-steps";

describe("UploadDropzone", () => {
  it("keeps the hidden file input inside a 1px wrapper so it cannot stretch the page", () => {
    const { container } = render(
      <UploadDropzone inputId="import-file" accept=".csv" reading={false} onFile={vi.fn()} />,
    );
    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    // The bug: `sr-only` on the Input was overridden by its `w-full`, stretching
    // the document. The wrapper keeps the 1px box; the input keeps its width.
    expect(input?.parentElement).toHaveClass("tw:sr-only");
    expect(input).not.toHaveClass("tw:sr-only");
  });
});

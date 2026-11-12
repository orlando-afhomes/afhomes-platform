import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Pagination, pageItems } from "./pagination";

afterEach(cleanup);

describe("pageItems", () => {
  it("lists every page when there are few", () => {
    expect(pageItems(1, 3)).toEqual([1, 2, 3]);
  });

  it("collapses gaps into ellipses around the current page", () => {
    expect(pageItems(1, 10)).toEqual([1, 2, "ellipsis", 10]);
    expect(pageItems(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
    expect(pageItems(10, 10)).toEqual([1, "ellipsis", 9, 10]);
  });
});

describe("Pagination", () => {
  it("shows the visible range and total", () => {
    render(<Pagination page={2} pageSize={10} total={48} onPageChange={() => {}} />);
    expect(screen.getByText("11–20")).toBeInTheDocument();
    expect(screen.getByText("48")).toBeInTheDocument();
  });

  it("calls onPageChange from the controls and disables the ends", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    function ControlledPagination() {
      const [page, setPage] = useState(1);
      return <Pagination page={page} pageSize={10} total={48} onPageChange={(nextPage) => {
        onPageChange(nextPage);
        setPage(nextPage);
      }} />;
    }
    render(<ControlledPagination />);
    expect(screen.getByRole("button", { name: "First page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    await user.click(screen.getByRole("button", { name: "Last page" }));
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Last page" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Page 4" }));
    expect(onPageChange.mock.calls.map((call) => call[0])).toEqual([2, 5, 4]);
  });

  it("renders no page controls for a single page", () => {
    render(<Pagination page={1} pageSize={10} total={4} onPageChange={() => {}} />);
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
    expect(screen.getByText("1–4")).toBeInTheDocument();
  });
});

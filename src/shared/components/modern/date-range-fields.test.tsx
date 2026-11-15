import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DateRangeFields } from "./date-range-fields";
import { FilterBar } from "./filter-bar";

afterEach(cleanup);

describe("DateRangeFields", () => {
  it("reports each date with the other kept, as YYYY-MM-DD text", () => {
    const onChange = vi.fn();
    render(<DateRangeFields from="2026-11-01" to="2026-11-15" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-10-20" } });
    expect(onChange).toHaveBeenLastCalledWith({ from: "2026-10-20", to: "2026-11-15" });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-11-30" } });
    expect(onChange).toHaveBeenLastCalledWith({ from: "2026-11-01", to: "2026-11-30" });
  });

  it("shows an inline error only when From is after To", () => {
    const { rerender } = render(<DateRangeFields from="2026-11-10" to="2026-11-01" onChange={() => undefined} fromLabel="Start" toLabel="End" />);
    expect(screen.getByRole("alert")).toHaveTextContent("End must be on or after Start.");
    expect(screen.getByLabelText("End")).toBeInvalid();
    rerender(<DateRangeFields from="2026-11-01" to="2026-11-01" onChange={() => undefined} fromLabel="Start" toLabel="End" />);
    expect(screen.queryByRole("alert")).toBeNull();
    rerender(<DateRangeFields from="" to="2026-11-01" onChange={() => undefined} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("works inside a FilterBar", () => {
    render(
      <FilterBar search="" onSearch={() => undefined}>
        <DateRangeFields from="" to="" onChange={() => undefined} />
      </FilterBar>,
    );
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
  });
});

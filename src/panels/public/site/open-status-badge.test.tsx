import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { OpenStatusBadge } from "./open-status-badge";

describe("OpenStatusBadge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows Open now during Manila office hours", () => {
    vi.setSystemTime(new Date("2026-11-18T01:30:00Z")); // 09:30 Manila
    render(<OpenStatusBadge />);

    const text = screen.getByText("Open now");
    expect(text).toBeInTheDocument();
    expect(text.closest(".site-badge")).toHaveClass("site-badge--live");
  });

  it("shows Closed now outside office hours", () => {
    vi.setSystemTime(new Date("2026-11-18T10:00:00Z")); // 18:00 Manila
    render(<OpenStatusBadge />);

    const text = screen.getByText("Closed now");
    expect(text).toBeInTheDocument();
    expect(text.closest(".site-badge")).toHaveClass("site-badge--neutral");
  });

  it("flips to Closed now when the office closes while the page is open", () => {
    vi.setSystemTime(new Date("2026-11-18T08:59:00Z")); // 16:59 Manila
    render(<OpenStatusBadge />);
    expect(screen.getByText("Open now")).toBeInTheDocument();

    act(() => {
      vi.setSystemTime(new Date("2026-11-18T09:00:00Z")); // 17:00 Manila
      vi.advanceTimersByTime(30_000);
    });

    expect(screen.getByText("Closed now")).toBeInTheDocument();
  });
});

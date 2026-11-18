import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  PublicArticleSkeleton,
  PublicFormPageSkeleton,
  PublicHeroSkeleton,
  PublicLoginSkeleton,
  PublicSectionSkeleton,
  PublicTierGridSkeleton,
} from "./public-skeletons";

afterEach(cleanup);

const SKELETONS = [
  ["hero", () => <PublicHeroSkeleton />],
  ["hero without actions or media", () => <PublicHeroSkeleton actions={false} media={false} />],
  ["section", () => <PublicSectionSkeleton />],
  ["section with two cards", () => <PublicSectionSkeleton cards={2} />],
  ["tier grid", () => <PublicTierGridSkeleton />],
  ["article", () => <PublicArticleSkeleton />],
  ["form page", () => <PublicFormPageSkeleton />],
  ["form page with two fields", () => <PublicFormPageSkeleton fields={2} />],
  ["login", () => <PublicLoginSkeleton />],
] as const;

describe("public skeletons", () => {
  it.each(SKELETONS)("renders %s as a busy status region with skeleton blocks and no page copy", (_name, ui) => {
    const { container } = render(ui());

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status.textContent?.trim()).toBe("Loading…");
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("drops the hero actions and media panels when asked", () => {
    const full = render(<PublicHeroSkeleton />);
    const fullCount = full.container.querySelectorAll('[data-slot="skeleton"]').length;
    full.unmount();

    const reduced = render(<PublicHeroSkeleton actions={false} media={false} />);
    const reducedCount = reduced.container.querySelectorAll('[data-slot="skeleton"]').length;
    expect(reducedCount).toBeLessThan(fullCount);
  });

  it("scales the section card grid with the card count", () => {
    const two = render(<PublicSectionSkeleton cards={2} />);
    const twoCount = two.container.querySelectorAll('[data-slot="skeleton"]').length;
    two.unmount();

    const five = render(<PublicSectionSkeleton cards={5} />);
    const fiveCount = five.container.querySelectorAll('[data-slot="skeleton"]').length;
    expect(fiveCount).toBeGreaterThan(twoCount);
  });

  it("renders the login shell around a form skeleton", () => {
    const { container } = render(<PublicLoginSkeleton />);

    expect(container.querySelector(".login-shell")).not.toBeNull();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(4);
  });
});

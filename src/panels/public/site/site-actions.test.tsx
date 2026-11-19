import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SiteButton } from "./blocks";

afterEach(cleanup);

describe("SiteButton action identity", () => {
  it("gives Contact us its icon and a surface-aware variant", () => {
    const { rerender } = render(<SiteButton href="/contact" action="contact">Contact us</SiteButton>);
    const light = screen.getByRole("link", { name: "Contact us" });
    expect(light).toHaveClass("site-button", "site-button--primary");
    expect(light.querySelector("svg")).not.toBeNull();

    rerender(<SiteButton href="/contact" action="contact" surface="dark">Contact us</SiteButton>);
    expect(screen.getByRole("link", { name: "Contact us" })).toHaveClass("site-button--primary");

    rerender(<SiteButton href="/contact" action="contact" surface="dark" primaryTone="contrast">Contact us</SiteButton>);
    expect(screen.getByRole("link", { name: "Contact us" })).toHaveClass("site-button--light");
  });

  it("keeps secondary actions ghost white and premium actions gold", () => {
    render(
      <>
        <SiteButton href="/faq#payment" action="payment-steps" surface="dark">Payment steps</SiteButton>
        <SiteButton href="/vip-privilege" action="join-vip" surface="dark">Join VIP</SiteButton>
        <SiteButton href="#amenities" action="amenities" surface="dark">View amenities</SiteButton>
      </>,
    );
    expect(screen.getByRole("link", { name: "Payment steps" })).toHaveClass("site-button--outline-light");
    expect(screen.getByRole("link", { name: "Join VIP" })).toHaveClass("site-button--gold");
    expect(screen.getByRole("link", { name: "View amenities" })).toHaveClass("site-button--outline-light");
  });
});

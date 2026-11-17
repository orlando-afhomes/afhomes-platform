import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

const brand = { name: "Test Brand", href: "/", logoSrc: "/images/logo.png" };

afterEach(cleanup);

describe("SiteHeader", () => {
  it("renders the given links, dropdown group and action buttons", () => {
    render(
      <SiteHeader
        brand={brand}
        items={[
          { href: "/about", label: "About" },
          { label: "Experiences", children: [{ href: "/experiences/one", label: "Experience One", description: "First" }] },
        ]}
        actions={[{ href: "/verify", label: "Verify Now", variant: "primary" }]}
        mobileExtraLinks={[{ href: "/login", label: "Staff Login" }]}
      />,
    );
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "Verify Now" })).toHaveAttribute("href", "/verify");
    expect(screen.getByRole("link", { name: "Test Brand home" })).toHaveAttribute("href", "/");
  });

  it("opens the dropdown group on click and shows its links", async () => {
    const user = userEvent.setup();
    render(
      <SiteHeader
        brand={brand}
        items={[{ label: "Experiences", children: [{ href: "/experiences/one", label: "Experience One", description: "First" }] }]}
        actions={[]}
      />,
    );
    const trigger = screen.getByRole("button", { name: /Experiences/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: /Experience One/ })).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /Experience One/ })).toHaveAttribute("href", "/experiences/one");
  });
});

describe("SiteFooter", () => {
  it("renders brand, contacts, link columns, offices and legal text", () => {
    render(
      <SiteFooter
        brand={{ name: "Test Group", tagline: "Tagline here", logoSrc: "/images/logo.png" }}
        contacts={[{ icon: <span />, label: "info@example.test", href: "mailto:info@example.test" }]}
        columns={[{ heading: "Explore", links: [{ href: "/about", label: "About" }] }]}
        locations={[{ label: "Head Office", lines: ["Brgy. Example"], landmark: "Near the plaza" }]}
        legal={{ disclaimer: "Disclaimer body text", copyright: "© 2026 Test Group" }}
      />,
    );
    expect(screen.getByRole("navigation", { name: "Explore" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "info@example.test" })).toHaveAttribute("href", "mailto:info@example.test");
    expect(screen.getByText("Head Office")).toBeInTheDocument();
    expect(screen.getByText("Near the plaza")).toBeInTheDocument();
    expect(screen.getByText(/Disclaimer body text/)).toBeInTheDocument();
    expect(screen.getByText("© 2026 Test Group")).toBeInTheDocument();
  });
});

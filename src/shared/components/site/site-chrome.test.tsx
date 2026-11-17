import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteBadge } from "./site-badge";
import { SiteCallout } from "./site-callout";
import { SiteFeatureCard } from "./site-feature-card";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { SiteRoomCard } from "./site-room-card";
import { SiteTierCard } from "./site-tier-card";

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

describe("shared site components", () => {
  it("SiteBadge applies the tone class", () => {
    render(<SiteBadge tone="live">Now open</SiteBadge>);
    expect(screen.getByText("Now open")).toHaveClass("site-badge", "site-badge--live");
  });

  it("SiteFeatureCard links to the page and shows its badge, title and text", () => {
    render(
      <SiteFeatureCard
        href="/experiences/one"
        title="Experience One"
        text="Short description."
        image={{ src: "/images/logo.png", alt: "One" }}
        badge={{ label: "In development", tone: "progress" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Experience One: learn more" })).toHaveAttribute("href", "/experiences/one");
    expect(screen.getByText("In development")).toHaveClass("site-badge--progress");
    expect(screen.getByRole("heading", { name: "Experience One" })).toBeInTheDocument();
    expect(screen.getByText("Short description.")).toBeInTheDocument();
  });

  it("SiteCallout renders its message and one action link", () => {
    render(<SiteCallout icon={<span />} title="Verify Accreditation" text="Check a seller." href="/verify" cta="Verify now" />);
    expect(screen.getByRole("heading", { name: "Verify Accreditation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Verify now" })).toHaveAttribute("href", "/verify");
  });

  it("SiteRoomCard links to the room and shows its type and name", () => {
    render(<SiteRoomCard href="/rooms" name="King Villa" category="Villa" image={{ src: "/images/logo.png", alt: "King Villa" }} />);
    expect(screen.getByRole("link", { name: "King Villa: view details" })).toHaveAttribute("href", "/rooms");
    expect(screen.getByText("Villa")).toBeInTheDocument();
  });

  it("SiteTierCard sets the tier color class and shows its lines", () => {
    const { container } = render(
      <SiteTierCard
        tier="silver"
        name="Silver"
        image="/images/cards/silver.webp"
        imageAlt="Silver card"
        benefits={[{ label: "Discount", value: "20%", note: "For 10 years" }, { label: "Stay points", value: "20,000", note: "Every year" }]}
      />,
    );
    expect(container.querySelector(".site-tier-card--silver")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Silver" })).toBeInTheDocument();
    expect(screen.getByText("Stay points")).toBeInTheDocument();
    expect(screen.getByText("For 10 years")).toBeInTheDocument();
    expect(screen.getByText("20,000")).toBeInTheDocument();
  });
});

describe("SiteHeader scroll marker", () => {
  it("sets data-scrolled after the page scrolls past the threshold and clears it at the top", () => {
    const { container } = render(<SiteHeader brand={brand} items={[]} actions={[]} />);
    const header = container.querySelector("header")!;
    expect(header).not.toHaveAttribute("data-scrolled");

    Object.defineProperty(window, "scrollY", { value: 200, configurable: true });
    fireEvent.scroll(window);
    expect(header).toHaveAttribute("data-scrolled");

    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
    fireEvent.scroll(window);
    expect(header).not.toHaveAttribute("data-scrolled");
  });
});

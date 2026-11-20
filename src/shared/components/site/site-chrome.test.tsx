import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteBadge } from "./site-badge";
import { SiteCallout } from "./site-callout";
import { SiteFeatureCard } from "./site-feature-card";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { SiteRoomCard } from "./site-room-card";
import { SiteTierCard } from "./site-tier-card";

const navState = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => navState.pathname }));

const brand = { name: "Test Brand", href: "/", logoSrc: "/images/logo.png" };

beforeEach(() => {
  navState.pathname = "/";
});

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

  it("marks the Verify page so its header opts out of the transparent style", () => {
    const { container, rerender } = render(<SiteHeader brand={brand} items={[]} actions={[]} page="verify" />);
    expect(container.querySelector('header[data-page="verify"]')).not.toBeNull();

    rerender(<SiteHeader brand={brand} items={[]} actions={[]} />);
    expect(container.querySelector("header")).not.toHaveAttribute("data-page");
  });

  it("marks only the link for the current page", () => {
    navState.pathname = "/vip-privilege";
    render(
      <SiteHeader
        brand={brand}
        items={[
          { href: "/", label: "Home" },
          { href: "/vip-privilege", label: "VIP Privilege" },
        ]}
        actions={[]}
      />,
    );
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "VIP Privilege" })).toHaveAttribute("aria-current", "page");
  });

  it("marks a dropdown group when one of its pages is current", () => {
    navState.pathname = "/about";
    render(
      <SiteHeader
        brand={brand}
        items={[{ label: "Explore", children: [{ href: "/about", label: "About" }, { href: "/faq", label: "FAQ" }] }]}
        actions={[]}
      />,
    );
    expect(screen.getByRole("button", { name: /Explore/ })).toHaveAttribute("aria-current", "true");
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

  it("marks the dropdown trigger with the group's class so page CSS can single out one group", () => {
    render(
      <SiteHeader
        brand={brand}
        items={[
          { label: "Experiences", triggerClassName: "site-header__dropdown-button--experiences", children: [{ href: "/experiences/one", label: "Experience One" }] },
          { label: "Explore", triggerClassName: "site-header__dropdown-button--explore", children: [{ href: "/faq", label: "FAQ" }] },
        ]}
        actions={[]}
      />,
    );
    expect(screen.getByRole("button", { name: /Experiences/ })).toHaveClass("site-header__dropdown-button--experiences");
    expect(screen.getByRole("button", { name: /Explore/ })).toHaveClass("site-header__dropdown-button--explore");
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

  it("SiteRoomCard can open details by clicking the whole card", async () => {
    const user = userEvent.setup();
    let opened = false;
    render(
      <SiteRoomCard
        name="King Villa"
        category="Villa"
        image={{ src: "/images/logo.png", alt: "King Villa" }}
        onSelect={() => { opened = true; }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "King Villa: view details" }));
    expect(opened).toBe(true);
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

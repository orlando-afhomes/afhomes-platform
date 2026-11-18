import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ABOUT } from "@/modules/public-site/content/about";
import { BLOG_PAGE, BLOG_POSTS, BLOG_POST_PAGE } from "@/modules/public-site/content/blog";
import { COMPLIANCE_DOCUMENT_IMAGES, COMPLIANCE_PAGE } from "@/modules/public-site/content/compliance";
import { FAQ_PAGE } from "@/modules/public-site/content/faq";
import { EXPERIENCE_CARDS, HOTEL, KEY_OFFERINGS, RESORT, RESORT_AMENITIES, RESTAURANT, ROOMS } from "@/modules/public-site/content/experiences";
import { FOOTER_COLUMNS, MAIN_NAV, EXPERIENCE_LINKS, ACTION_LINKS, OFFICES } from "@/modules/public-site/content/site";
import { VIP_PAGE, VIP_TIERS } from "@/modules/public-site/content/vip";
import { PublicFooter } from "./components/public-footer";
import { PublicHeader } from "./components/public-header";
import { PublicHomePage } from "./pages/public-home-page";

const APP_ROOTS = ["src/app", "src/app/(public)"];
const routeExists = (href: string) =>
  APP_ROOTS.some((root) => existsSync(join(process.cwd(), root, href.split("#")[0].slice(1), "page.tsx")));
const publicFile = (src: string) => existsSync(join(process.cwd(), "public", src));

describe("public sign-in and verification links", () => {
  it("shows Verify Accreditation in the header and on the home page", () => {
    render(
      <>
        <PublicHeader />
        <PublicHomePage />
      </>,
    );
    expect(screen.getByRole("link", { name: "Verify Accreditation" })).toHaveAttribute("href", "/verify");
    // The header and the Home hero both offer Join VIP; both go to the card comparison.
    for (const link of screen.getAllByRole("link", { name: "Join VIP" })) expect(link).toHaveAttribute("href", "/vip-privilege#cards");
    expect(screen.getByRole("link", { name: "Verify now" })).toHaveAttribute("href", "/verify");
  });

  it("keeps the public header to five top-level navigation entries", () => {
    const { container } = render(<PublicHeader />);
    expect(container.querySelectorAll(".site-header__nav > *")).toHaveLength(5);
  });

  it("keeps Contact as a top-level link, outside the Explore dropdown", () => {
    const { container } = render(<PublicHeader />);
    const contact = container.querySelector('.site-header__nav a[href="/contact"]');
    expect(contact).not.toBeNull();
    expect(contact?.closest(".site-header__panel")).toBeNull();
  });

  it("uses the AFHomes Group brand and the Explore menu label", () => {
    const { container } = render(<PublicHeader />);
    expect(container.querySelector(".site-header__brand")).toHaveAttribute("aria-label", "AFHomes Group of Companies home");
    const navText = container.querySelector(".site-header__nav")?.textContent ?? "";
    expect(navText).toContain("Explore");
    expect(navText).not.toContain("More");
  });

  it("links Sales Sign-In from the footer Access column", () => {
    const { container } = render(
      <>
        <PublicHeader />
        <PublicHomePage />
        <PublicFooter />
      </>,
    );
    const sales = screen.getAllByRole("link", { name: /Sales Sign-In/ });
    expect(sales.length).toBeGreaterThan(0);
    for (const link of sales) expect(link).toHaveAttribute("href", "/login/sales");
    expect(container.querySelector('.site-footer a[href="/login/sales"]')).not.toBeNull();
    expect(routeExists("/login/sales")).toBe(true);
  });

  it("shows Staff Login and Sales Sign-In in the mobile menu Access block", async () => {
    const user = userEvent.setup();
    const { container } = render(<PublicHeader />);
    await user.click(within(container).getByRole("button", { name: "Open menu" }));
    const dialog = await screen.findByRole("dialog", { name: "AFHomes Group of Companies menu" });
    expect(within(dialog).getByText("Access")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Staff Login" })).toHaveAttribute("href", "/login");
    expect(within(dialog).getByRole("link", { name: "Sales Sign-In" })).toHaveAttribute("href", "/login/sales");
  });

  it("points only at routes that exist under src/app", () => {
    render(
      <>
        <PublicHeader />
        <PublicFooter />
        <PublicHomePage />
      </>,
    );
    for (const link of screen.getAllByRole("link")) {
      const href = link.getAttribute("href")!;
      if (!href.startsWith("/")) continue;
      expect(routeExists(href.split("#")[0] || "/"), href).toBe(true);
    }
  });

  it("keeps every menu and footer target on an existing route", () => {
    const footerLinks = FOOTER_COLUMNS.flatMap((column) => column.links);
    for (const link of [...MAIN_NAV, ...EXPERIENCE_LINKS, ...ACTION_LINKS, ...footerLinks]) expect(routeExists(link.href), link.href).toBe(true);
    for (const post of BLOG_POSTS) expect(routeExists("/blog"), post.slug).toBe(true);
  });
});

describe("public site pictures", () => {
  it("only references pictures that exist under public/", () => {
    const sources = [
      ABOUT.hero.src, ABOUT.story.image.src, ...ABOUT.experiences.cards.map((card) => card.image.src), ABOUT.featured.image.src, ABOUT.transparency.image.src, ...ABOUT.awaits.items.map((item) => item.image.src), ABOUT.logo.image.src, ABOUT.closing.image.src, ...ABOUT.registrations.map((item) => item.image.src),
      RESORT.masterplan.src, HOTEL.hero.src, HOTEL.apnea.image.src, ...HOTEL.gallery.map((item) => item.src), ...HOTEL.lounge.items.map((item) => item.image.src),
      RESTAURANT.hero.src, ...EXPERIENCE_CARDS.map((card) => card.image.src), ...KEY_OFFERINGS.map((item) => item.image!.src),
      ...RESORT_AMENITIES.map((item) => item.src), ...ROOMS.flatMap((room) => [...room.photos.map((photo) => photo.src), ...(room.floorPlan ? [room.floorPlan.src] : [])]), ...OFFICES.map((office) => office.map.image.src),
      ...COMPLIANCE_DOCUMENT_IMAGES.map((item) => item.src), COMPLIANCE_PAGE.hero.image.src, COMPLIANCE_PAGE.closing.image.src, FAQ_PAGE.hero.image.src, FAQ_PAGE.closing.image.src, BLOG_PAGE.hero.image.src, BLOG_POST_PAGE.highlightsImage.src, BLOG_POST_PAGE.closing.image.src, BLOG_POST_PAGE.cta.image.src, ...VIP_TIERS.map((tier) => tier.image), VIP_PAGE.hero.image.src, VIP_PAGE.benefits.image.src, VIP_PAGE.closing.image.src, ...BLOG_POSTS.map((post) => post.cover.src),
    ];
    expect(sources.length).toBeGreaterThan(50);
    for (const src of sources) expect(publicFile(src), src).toBe(true);
  });

  it("carries over all nine blog posts with unique slugs", () => {
    expect(BLOG_POSTS).toHaveLength(9);
    expect(new Set(BLOG_POSTS.map((post) => post.slug)).size).toBe(9);
  });
});

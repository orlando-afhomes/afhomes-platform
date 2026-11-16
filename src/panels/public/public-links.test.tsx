import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { ABOUT } from "@/modules/public-site/content/about";
import { BLOG_POSTS } from "@/modules/public-site/content/blog";
import { COMPLIANCE_DOCUMENT_IMAGES } from "@/modules/public-site/content/compliance";
import { EXPERIENCE_CARDS, HOTEL, KEY_OFFERINGS, RESORT, RESORT_AMENITIES, RESTAURANT, ROOMS } from "@/modules/public-site/content/experiences";
import { FOOTER_LINKS, MAIN_NAV, EXPERIENCE_LINKS, ACTION_LINKS } from "@/modules/public-site/content/site";
import { VIP_TIERS } from "@/modules/public-site/content/vip";
import { PublicFooter } from "./components/public-footer";
import { PublicHeader } from "./components/public-header";
import { PublicHomePage } from "./pages/public-home-page";

const routeExists = (href: string) => existsSync(join(process.cwd(), "src/app", href.slice(1), "page.tsx"));
const publicFile = (src: string) => existsSync(join(process.cwd(), "public", src));

describe("public sign-in and verification links", () => {
  it("shows Sales Sign-In and Verify Accreditation in the header and on the home page", () => {
    render(
      <>
        <PublicHeader />
        <PublicHomePage />
      </>,
    );
    for (const [name, href] of [["Sales Sign-In", "/login/sales"], ["Verify Accreditation", "/verify"]]) {
      const links = screen.getAllByRole("link", { name });
      expect(links).toHaveLength(2);
      for (const link of links) expect(link).toHaveAttribute("href", href);
    }
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
    for (const link of [...MAIN_NAV, ...EXPERIENCE_LINKS, ...ACTION_LINKS, ...FOOTER_LINKS]) expect(routeExists(link.href), link.href).toBe(true);
    for (const post of BLOG_POSTS) expect(routeExists("/blog"), post.slug).toBe(true);
  });
});

describe("public site pictures", () => {
  it("only references pictures that exist under public/", () => {
    const sources = [
      ABOUT.hero.src, ABOUT.transparency.image.src, ABOUT.logo.image.src, ABOUT.visit.map.src, ...ABOUT.registrations.map((item) => item.image.src),
      RESORT.masterplan.src, HOTEL.hero.src, HOTEL.apnea.image.src, ...HOTEL.gallery.map((item) => item.src), ...HOTEL.lounge.items.map((item) => item.image.src),
      RESTAURANT.hero.src, ...EXPERIENCE_CARDS.map((card) => card.image.src), ...KEY_OFFERINGS.map((item) => item.image!.src),
      ...RESORT_AMENITIES.map((item) => item.src), ...ROOMS.flatMap((room) => [...room.photos.map((photo) => photo.src), ...(room.floorPlan ? [room.floorPlan.src] : [])]),
      ...COMPLIANCE_DOCUMENT_IMAGES.map((item) => item.src), ...VIP_TIERS.map((tier) => tier.image), ...BLOG_POSTS.map((post) => post.cover.src),
    ];
    expect(sources.length).toBeGreaterThan(50);
    for (const src of sources) expect(publicFile(src), src).toBe(true);
  });

  it("carries over all nine blog posts with unique slugs", () => {
    expect(BLOG_POSTS).toHaveLength(9);
    expect(new Set(BLOG_POSTS.map((post) => post.slug)).size).toBe(9);
  });
});

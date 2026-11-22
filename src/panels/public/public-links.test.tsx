import { beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement, type ReactNode } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
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

const navState = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => navState.pathname }));

function SiteProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId="dev-super-admin">{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

function renderSite(ui: ReactElement) {
  return render(ui, { wrapper: SiteProviders });
}

beforeEach(() => {
  navState.pathname = "/";
});

const APP_ROOTS = ["src/app", "src/app/(public)", "src/app/(verify)", "src/app/(correction)"];
const routeExists = (href: string) =>
  APP_ROOTS.some((root) => existsSync(join(process.cwd(), root, href.split("#")[0].slice(1), "page.tsx")));
const publicFile = (src: string) => existsSync(join(process.cwd(), "public", src));

describe("public sign-in and verification links", () => {
  it("shows Verify Accreditation in the header and on the home page", () => {
    renderSite(
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

  it("marks only the current page in the header nav", () => {
    navState.pathname = "/vip-privilege";
    const { container } = render(<PublicHeader />);
    expect(container.querySelector('.site-header__nav a[href="/"]')).not.toHaveAttribute("aria-current");
    expect(container.querySelector('.site-header__nav a[href="/vip-privilege"]')).toHaveAttribute("aria-current", "page");
    expect(container.querySelector(".site-header__dropdown-button--explore")).not.toHaveAttribute("aria-current");
  });

  it("marks the Explore group when one of its pages is current", () => {
    navState.pathname = "/blog/a-post";
    const { container } = render(<PublicHeader />);
    expect(container.querySelector(".site-header__dropdown-button--explore")).toHaveAttribute("aria-current", "true");
    expect(container.querySelector('.site-header__nav a[href="/"]')).not.toHaveAttribute("aria-current");
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
    const { container } = renderSite(
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

  it("puts Staff Login and Sales Sign-In behind the mobile menu Access button", async () => {
    const user = userEvent.setup();
    const { container } = render(<PublicHeader />);
    await user.click(within(container).getByRole("button", { name: "Open menu" }));
    const dialog = await screen.findByRole("dialog", { name: "AFHomes Group of Companies menu" });
    const toggle = within(dialog).getByRole("button", { name: /Access/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(within(dialog).queryByRole("link", { name: "Staff Login" })).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(dialog).getByRole("link", { name: "Staff Login" })).toHaveAttribute("href", "/login");
    expect(within(dialog).getByRole("link", { name: "Sales Sign-In" })).toHaveAttribute("href", "/login/sales");
  });

  it("keeps the footer Access links behind a collapsed toggle", async () => {
    const user = userEvent.setup();
    const { container } = render(<PublicFooter />);
    const access = container.querySelector(".site-footer__access");
    expect(access).not.toBeNull();
    const toggle = within(access as HTMLElement).getByRole("button", { name: /Access/ });
    const panel = access?.querySelector(".site-footer__access-panel");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveAttribute("data-open", "false");
    expect(access?.querySelector('a[href="/login/sales"]')).not.toBeNull();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(panel).toHaveAttribute("data-open", "true");
    expect(within(access as HTMLElement).getByRole("link", { name: "Staff Login" })).toHaveAttribute("href", "/login");
  });

  it("points only at routes that exist under src/app", () => {
    renderSite(
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

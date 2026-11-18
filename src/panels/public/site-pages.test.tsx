import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VIP_TIERS } from "@/modules/public-site/content/vip";
import { BLOG_POSTS } from "@/modules/public-site/content/blog";
import { OFFICES, SITE } from "@/modules/public-site/content/site";
import { PUBLIC_SUPPORT_INFO } from "@/modules/public-site/support-info";
import { BlogPage, BlogPostPage } from "./pages/blog-pages";
import { ContactPage, FaqPage } from "./pages/faq-contact-pages";
import { VipPage } from "./pages/vip-page";
import { HotelPage, ResortPage, RestaurantPage } from "./pages/experience-pages";
import { HOTEL, RESTAURANT, RESORT, ROOMS } from "@/modules/public-site/content/experiences";

afterEach(cleanup);

describe("public site pages", () => {
  it("FAQ answers open from their question (a native summary, so the keyboard works in browsers)", async () => {
    const user = userEvent.setup();
    render(<FaqPage />);
    const summary = screen.getByText("Is your company offering bonds, shares, stocks, or co-ownership?").closest("summary")!;
    expect(summary).not.toHaveAttribute("tabindex", "-1");
    const details = summary.closest("details")!;
    expect(details.open).toBe(false);
    await user.click(summary);
    expect(details.open).toBe(true);
    expect(screen.getAllByText(/not an investment product, timeshare, or ownership stake/i).length).toBeGreaterThan(0);
  });

  it("FAQ search narrows the questions and says when nothing matches", async () => {
    const user = userEvent.setup();
    render(<FaqPage />);
    const search = screen.getByRole("searchbox", { name: /search the questions/i });
    await user.type(search, "DHSUD");
    expect(screen.getByText("Is AFhomes a real estate developer and does it need LTS from DHSUD?")).toBeInTheDocument();
    expect(screen.queryByText("Who is AFhomes Group of Companies?")).toBeNull();
    await user.clear(search);
    await user.type(search, "zzqx");
    expect(screen.getByText(/No questions match your search/i)).toBeInTheDocument();
  });

  it("shows the three VIP tiers with the doc 05 numbers and the doc 09 points wording", () => {
    render(<VipPage />);
    expect(VIP_TIERS.map((tier) => [tier.name, tier.discountPercent, tier.pointsPerYear])).toEqual([["Gold", 25, 25000], ["Silver", 20, 20000], ["Bronze", 15, 10000]]);
    expect(screen.getByText(/released when that year's qualifying spend/i)).toBeInTheDocument();
    expect(screen.queryByText(/upon activation/i)).toBeNull();
  });

  it("contact form refuses bad input and offers the email hand-off", async () => {
    const user = userEvent.setup();
    render(<ContactPage />);
    await user.click(screen.getByRole("button", { name: "Open email" }));
    expect(screen.getAllByText(/required|must be valid/i).length).toBeGreaterThan(1);
  });

  it("links contact actions to the form and official contact details", () => {
    const { container } = render(<ContactPage />);

    expect(screen.getAllByRole("heading", { name: "Satellite Office" })).toHaveLength(2); // contact card and map card
    expect(screen.getAllByRole("heading", { name: "Head Office" })).toHaveLength(2); // contact card and map card
    expect(screen.getByRole("link", { name: "Use the contact form" })).toHaveAttribute("href", "#contact-form");
    expect(screen.getByRole("link", { name: "Talk to us" })).toHaveAttribute("href", "#contact-form");
    expect(container.querySelector("#contact-form")).toContainElement(screen.getByRole("form", { name: "Contact form" }));

    // "Find us": one live map and one directions link per office.
    expect(screen.getAllByTitle(/^Map of the AFhomes /)).toHaveLength(OFFICES.length);
    const directions = screen.getAllByRole("link", { name: "Get directions" });
    expect(directions.map((link) => link.getAttribute("href"))).toEqual(OFFICES.map((office) => office.map.href));
    for (const link of directions) expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: PUBLIC_SUPPORT_INFO.email })).toHaveAttribute("href", `mailto:${PUBLIC_SUPPORT_INFO.email}`);
    expect(screen.getByRole("link", { name: PUBLIC_SUPPORT_INFO.phone })).toHaveAttribute("href", PUBLIC_SUPPORT_INFO.phoneHref);
    expect(screen.getByRole("link", { name: "Send us a message on Facebook" })).toHaveAttribute("href", SITE.facebookUrl);
  });

  it("blog index features the newest post, pages the rest six at a time, and filters by category", async () => {
    const user = userEvent.setup();
    render(<BlogPage />);
    expect(screen.getByRole("heading", { level: 2, name: BLOG_POSTS[0].title })).toBeInTheDocument();
    expect(screen.getByText(BLOG_POSTS[1].title)).toBeInTheDocument();
    expect(screen.queryByText(BLOG_POSTS[7].title)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Page 2" }));
    expect(screen.getByText(BLOG_POSTS[7].title)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Behind the Scenes/ }));
    expect(screen.getByRole("heading", { level: 2, name: BLOG_POSTS[3].title })).toBeInTheDocument();
    expect(screen.queryByText(BLOG_POSTS[0].title)).toBeNull();
  });

  it("renders a blog post with its date, text and neighbours", () => {
    render(<BlogPostPage post={BLOG_POSTS[3]} />);
    expect(screen.getByRole("heading", { level: 1, name: "We're Growing—Just for You!" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Teppanyaki Lounge" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Older post/ })).toHaveAttribute("href", `/blog/${BLOG_POSTS[4].slug}`);
  });
  it("resort page lists every room, opens its photos, and switches the location tab to the live map", async () => {
    const user = userEvent.setup();
    render(<ResortPage />);
    expect(screen.getByRole("heading", { level: 1, name: RESORT.title })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^View details: / })).toHaveLength(ROOMS.length);
    await user.click(screen.getByRole("button", { name: "View details: King Villa" }));
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Show: King Villa floor plan" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByTitle("Resort Location")).toBeNull();
    await user.click(screen.getByRole("tab", { name: /Resort map/ }));
    expect(screen.getByTitle("Resort Location")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Get directions/ })).toHaveAttribute("target", "_blank");
  });

  it("hotel and restaurant pages show their own title and details", () => {
    render(<HotelPage />);
    expect(screen.getByRole("heading", { level: 1, name: HOTEL.title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: HOTEL.lounge.title })).toBeInTheDocument();
    cleanup();
    render(<RestaurantPage />);
    expect(screen.getByRole("heading", { level: 1, name: RESTAURANT.title })).toBeInTheDocument();
    expect(screen.getByText(RESTAURANT.reservation)).toBeInTheDocument();
  });
});

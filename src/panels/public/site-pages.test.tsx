import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VIP_TIERS } from "@/modules/public-site/content/vip";
import { BLOG_POSTS } from "@/modules/public-site/content/blog";
import { ABOUT } from "@/modules/public-site/content/about";
import { SITE } from "@/modules/public-site/content/site";
import { PUBLIC_SUPPORT_INFO } from "@/modules/public-site/support-info";
import { BlogPage, BlogPostPage } from "./pages/blog-pages";
import { ContactPage, FaqPage } from "./pages/faq-contact-pages";
import { VipPage } from "./pages/vip-page";

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

    expect(screen.getByRole("heading", { name: "Satellite Office" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Head Office" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Use the contact form" })).toHaveAttribute("href", "#contact-form");
    expect(screen.getByRole("link", { name: "Talk to us" })).toHaveAttribute("href", "#contact-form");
    expect(container.querySelector("#contact-form")).toContainElement(screen.getByRole("form", { name: "Contact form" }));

    const mapLink = screen.getByRole("link", { name: "View on Map" });
    expect(mapLink).toHaveAttribute("href", ABOUT.visit.directionsHref);
    expect(mapLink).toHaveAttribute("target", "_blank");
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
    expect(screen.getByText("Teppanyaki Lounge")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Older post/ })).toHaveAttribute("href", `/blog/${BLOG_POSTS[4].slug}`);
  });
});

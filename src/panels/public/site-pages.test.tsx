import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VIP_TIERS } from "@/modules/public-site/content/vip";
import { BLOG_POSTS } from "@/modules/public-site/content/blog";
import { BlogPostPage } from "./pages/blog-pages";
import { ContactPage, FaqPage } from "./pages/faq-contact-pages";
import { VipPage } from "./pages/vip-page";

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

  it("shows the three VIP tiers with the doc 05 numbers and the doc 09 points wording", () => {
    render(<VipPage />);
    expect(VIP_TIERS.map((tier) => [tier.name, tier.discountPercent, tier.pointsPerYear])).toEqual([["Gold", 25, 25000], ["Silver", 20, 20000], ["Bronze", 15, 10000]]);
    expect(screen.getByText(/released when that year's qualifying spend/i)).toBeInTheDocument();
    expect(screen.queryByText(/upon activation/i)).toBeNull();
  });

  it("contact form refuses bad input and offers the email hand-off", async () => {
    const user = userEvent.setup();
    render(<ContactPage />);
    await user.click(screen.getByRole("button", { name: "Open email to send" }));
    expect(screen.getAllByText(/required|must be valid/i).length).toBeGreaterThan(1);
  });

  it("renders a blog post with its date, text and neighbours", () => {
    render(<BlogPostPage post={BLOG_POSTS[3]} />);
    expect(screen.getByRole("heading", { level: 1, name: "We're Growing—Just for You!" })).toBeInTheDocument();
    expect(screen.getByText("Teppanyaki Lounge")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Older post/ })).toHaveAttribute("href", `/blog/${BLOG_POSTS[4].slug}`);
  });
});

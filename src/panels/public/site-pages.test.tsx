import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VIP_TIERS } from "@/modules/public-site/content/vip";
import { BLOG_POSTS } from "@/modules/public-site/content/blog";
import { FAQ_INTRO, FAQ_PAGE } from "@/modules/public-site/content/faq";
import { OFFICES, SITE } from "@/modules/public-site/content/site";
import { PUBLIC_SUPPORT_INFO } from "@/modules/public-site/support-info";
import { BlogPage, BlogPostPage } from "./pages/blog-pages";
import { ContactPage, FaqPage } from "./pages/faq-contact-pages";
import { PublicHomePage } from "./pages/public-home-page";
import { VipPage } from "./pages/vip-page";
import { HotelPage, ResortPage, RestaurantPage } from "./pages/experience-pages";
import { HOTEL, RESTAURANT, RESORT, RESORT_AMENITIES, ROOMS } from "@/modules/public-site/content/experiences";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("public site pages", () => {
  it("FAQ answers open from an accessible disclosure button", async () => {
    const user = userEvent.setup();
    render(<FaqPage />);
    const button = screen.getByRole("button", { name: /Is your company offering bonds, shares, stocks, or co-ownership\?/ });
    expect(button).toHaveAttribute("aria-expanded", "false");
    const answer = document.getElementById(button.getAttribute("aria-controls")!)!;
    expect(answer).toHaveAttribute("aria-hidden", "true");
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(answer).toHaveAttribute("aria-hidden", "false");
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
    expect(screen.getByText(FAQ_PAGE.questions.empty)).toBeInTheDocument();
    expect(screen.getByText("No questions found")).toBeInTheDocument();
  });

  it("keeps the FAQ hero and section copy within the owner's word limits", () => {
    const words = (value: string) => value.trim().split(/\s+/).length;
    expect(words(FAQ_INTRO.lede)).toBeLessThanOrEqual(4);
    expect(words(FAQ_INTRO.text)).toBe(6);
    expect(words(FAQ_PAGE.questions.text)).toBeLessThanOrEqual(7);
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

    // "Find us": one static route map and two map actions per office.
    expect(screen.getAllByRole("img", { name: "AFhomes route map" })).toHaveLength(OFFICES.length);
    expect(screen.getByText("Alaminos Commercial Complex, Alaminos, Laguna")).toBeInTheDocument();
    const directions = screen.getAllByRole("link", { name: "Get directions" });
    expect(directions.map((link) => link.getAttribute("href"))).toEqual(OFFICES.map((office) => office.map.directionsHref));
    const maps = screen.getAllByRole("link", { name: "Open map" });
    expect(maps.map((link) => link.getAttribute("href"))).toEqual(OFFICES.map((office) => office.map.href));
    for (const link of [...directions, ...maps]) expect(link).toHaveAttribute("target", "_blank");
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
  it("puts the experience status above the eyebrow", () => {
    const { container } = render(<ResortPage />);
    const top = container.querySelector(".exp-hero .site-home-hero__top");
    expect(top).not.toBeNull();
    expect(top?.querySelector(".exp-hero__status")?.textContent).toBe("In development");
    expect(top?.nextElementSibling?.classList.contains("site-eyebrow")).toBe(true);
  });

  it("places the contact form before the contact details", () => {
    const { container } = render(<ContactPage />);
    const form = container.querySelector("#contact-form");
    const details = container.querySelector(".contact-details");
    expect(form).not.toBeNull();
    expect(details).not.toBeNull();
    expect(form!.compareDocumentPosition(details!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("puts a decorative blurred backdrop behind blog card covers", () => {
    const { container } = render(<BlogPage />);
    const covers = container.querySelectorAll(".blog-card__photo");
    expect(covers.length).toBeGreaterThan(0);
    for (const cover of covers) expect(cover.querySelectorAll("img")).toHaveLength(2);
    expect(container.querySelector(".blog-featured__photo img[aria-hidden='true']")).not.toBeNull();
  });

  it("moves through room photos with the arrow keys and shows the counter", async () => {
    const user = userEvent.setup();
    render(<ResortPage />);
    await user.click(screen.getByRole("button", { name: "View details: Premier A-Frame" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("1 / 2")).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(within(dialog).getByText("2 / 2")).toBeInTheDocument();
  });

  it("opens the amenities photos in the shared gallery with arrows and a counter", async () => {
    const user = userEvent.setup();
    render(<ResortPage />);
    await user.click(screen.getAllByRole("button", { name: /^Enlarge: / })[0]);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(`1 / ${RESORT_AMENITIES.length}`)).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(within(dialog).getByText(`2 / ${RESORT_AMENITIES.length}`)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Next picture" }));
    expect(within(dialog).getByText(`3 / ${RESORT_AMENITIES.length}`)).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("resort page lists every room, opens its photos, and switches the location tab to the live map", async () => {
    const user = userEvent.setup();
    render(<ResortPage />);
    expect(screen.getByRole("heading", { level: 1, name: RESORT.title })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^View details: / })).toHaveLength(ROOMS.length);
    expect(screen.queryByRole("button", { name: /^Show: / })).toBeNull();
    await user.click(screen.getByRole("button", { name: "View details: King Villa" }));
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Show: King Villa floor plan" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByTitle("Resort Location")).toBeNull();
    await user.click(screen.getByRole("tab", { name: /Resort map/ }));
    expect(screen.getByTitle("Resort Location")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Get directions/ })).toHaveAttribute("target", "_blank");
  });

  it("home room cards open details in place", async () => {
    const user = userEvent.setup();
    render(<PublicHomePage />);
    expect(screen.getByRole("link", { name: "View floor plans" })).toHaveAttribute("href", "/experiences/hotspring-ecofarm-resort#accommodations");
    await user.click(screen.getByRole("button", { name: "King Villa: view details" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Show: King Villa floor plan" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "King Villa: view resort page" })).toBeNull();
  });

  it("opens a room's View details from a room deep link", async () => {
    window.history.replaceState(null, "", "#room-king-villa");
    render(<ResortPage />);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Show: King Villa floor plan" })).toBeInTheDocument();
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

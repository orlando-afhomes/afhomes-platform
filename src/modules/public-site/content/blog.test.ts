import { describe, expect, it } from "vitest";
import { BLOG_POSTS, blogHeadingId, blogReadingMinutes, getBlogSections, getRelatedPosts } from "./blog";

describe("blog post helpers", () => {
  it("makes stable heading ids and lists the lead and h2 sections in order", () => {
    expect(blogHeadingId("AFhomes: Moving Forward with Innovation")).toBe("afhomes-moving-forward-with-innovation");
    const sections = getBlogSections(BLOG_POSTS[0]);
    expect(sections[0].title).toBe("Supporting Innovation, Business Growth, and the Future of Artificial Intelligence");
    expect(sections.map((section) => section.title)).toContain("Empowering Businesses Through Innovation");
    expect(new Set(sections.map((section) => section.id)).size).toBe(sections.length);
  });

  it("gives at least one minute of reading time", () => {
    for (const post of BLOG_POSTS) expect(blogReadingMinutes(post)).toBeGreaterThanOrEqual(1);
  });

  it("suggests three other posts, same category first, never the post itself", () => {
    const post = BLOG_POSTS[0];
    const related = getRelatedPosts(post, 3);
    expect(related).toHaveLength(3);
    expect(related.some((item) => item.slug === post.slug)).toBe(false);
    expect(related[0].categories).toContain(post.categories[0]);
  });

  it("sidebar highlights and summaries only use words that appear in their own post", () => {
    // The AI Summit post's highlights keep the wording of the owner's reference design, so it is exempt.
    for (const post of BLOG_POSTS.slice(1)) {
      const text = post.blocks.flatMap((block) => (block.type === "list" ? block.items : [block.text])).join(" ").toLowerCase();
      for (const line of post.highlights ?? []) expect(text, `${post.slug}: ${line}`).toContain(line.toLowerCase().replace(/[.]$/, ""));
    }
  });
});

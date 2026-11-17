"use client";

import { useState } from "react";
import { BLOG_PAGE, type BlogCategory, type BlogPost } from "@/modules/public-site/content/blog";
import { Section, SectionHeading } from "../site/blocks";
import { BlogFilters } from "./blog-filters";
import { BlogFeatured } from "./blog-featured";
import { BlogCard } from "./blog-card";
import { BlogPagination } from "./blog-pagination";

/**
 * Category filter, featured post and paged story grid. The newest post in the chosen category is featured;
 * the rest fill the grid, BLOG_PAGE.pageSize at a time.
 */
export function BlogBrowser({ posts }: { posts: BlogPost[] }) {
  const [category, setCategory] = useState<"all" | BlogCategory>("all");
  const [page, setPage] = useState(1);
  const visible = posts.filter((post) => category === "all" || post.categories.includes(category));
  const [featured, ...rest] = visible;
  const pageCount = Math.max(1, Math.ceil(rest.length / BLOG_PAGE.pageSize));
  const current = Math.min(page, pageCount);
  const shown = rest.slice((current - 1) * BLOG_PAGE.pageSize, current * BLOG_PAGE.pageSize);

  function chooseCategory(next: "all" | BlogCategory) {
    setCategory(next);
    setPage(1);
  }

  return (
    <Section className="blog-browser">
      <BlogFilters categories={BLOG_PAGE.filters} value={category} onChange={chooseCategory} />
      {featured ? <BlogFeatured post={featured} /> : <p className="blog-browser__empty" role="status">{BLOG_PAGE.empty}</p>}
      {rest.length > 0 ? (
        <div className="blog-browser__latest" id="latest">
          <SectionHeading eyebrow={BLOG_PAGE.latest.eyebrow} title={BLOG_PAGE.latest.title} />
          <ul className="blog-browser__grid">
            {shown.map((post) => (
              <li key={post.slug} className="site-home-reveal"><BlogCard post={post} /></li>
            ))}
          </ul>
          {pageCount > 1 ? <BlogPagination page={current} pageCount={pageCount} onChange={setPage} /> : null}
        </div>
      ) : null}
    </Section>
  );
}

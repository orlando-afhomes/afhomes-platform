"use client";

import { useState } from "react";
import Link from "next/link";
import { BLOG_CATEGORIES, formatBlogDate, type BlogCategory, type BlogPost } from "@/modules/public-site/content/blog";
import { Photo } from "./blocks";

/** Post list with a category filter, newest first. */
export function BlogIndex({ posts }: { posts: BlogPost[] }) {
  const [category, setCategory] = useState<"all" | BlogCategory>("all");
  const visible = posts.filter((post) => category === "all" || post.categories.includes(category));
  return (
    <div>
      <div className="site-filter" role="group" aria-label="Filter posts by category">
        <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")} className="site-filter__button">All</button>
        {BLOG_CATEGORIES.map((item) => (
          <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className="site-filter__button">{item}</button>
        ))}
      </div>
      <ul className="site-grid site-grid--3">
        {visible.map((post) => (
          <li key={post.slug} className="site-card site-card--link">
            <Link href={`/blog/${post.slug}`} className="site-card__link">
              <Photo image={post.cover} ratio="16 / 10" className="site-card__photo" sizes="(min-width: 1024px) 380px, 100vw" />
              <div className="site-card__body">
                <p className="site-card__meta"><time dateTime={post.date}>{formatBlogDate(post.date)}</time> · {post.categories[0]}</p>
                <h2 className="site-card__title">{post.title}</h2>
                <p className="site-card__text">{post.excerpt}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {visible.length === 0 ? <p className="site-note" role="status">No posts in this category yet.</p> : null}
    </div>
  );
}

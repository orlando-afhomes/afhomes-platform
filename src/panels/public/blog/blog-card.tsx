import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BLOG_PAGE, type BlogPost } from "@/modules/public-site/content/blog";
import { Photo } from "../site/blocks";
import { BlogMeta } from "./blog-meta";

/** One story in the "More Stories" grid: cover photo, category and date, title, excerpt and a "Read more" pill. */
export function BlogCard({ post }: { post: BlogPost }) {
  const href = `/blog/${post.slug}`;
  return (
    <article className="blog-card">
      <Photo image={post.cover} ratio="16 / 10" className="blog-card__photo" sizes="(min-width: 1000px) 400px, (min-width: 640px) 50vw, 100vw" />
      <div className="blog-card__body">
        <BlogMeta post={post} tone="light" />
        <h3 className="blog-card__title">
          <Link href={href} className="blog-card__title-link">{post.title}</Link>
        </h3>
        <p className="blog-card__excerpt">{post.excerpt}</p>
        <Link href={href} className="blog-card__cta" aria-label={`${BLOG_PAGE.cardCta}: ${post.title}`}>
          {BLOG_PAGE.cardCta}
          <ArrowRight aria-hidden="true" className="blog-card__cta-icon" />
        </Link>
      </div>
    </article>
  );
}

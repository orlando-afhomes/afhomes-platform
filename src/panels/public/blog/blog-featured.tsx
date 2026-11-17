import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BLOG_PAGE, type BlogPost } from "@/modules/public-site/content/blog";
import { Photo, SiteButton } from "../site/blocks";
import { BlogMeta } from "./blog-meta";

/** The newest post as a large card: cover photo on the left, green panel with meta, title, excerpt and a gold link on the right. */
export function BlogFeatured({ post }: { post: BlogPost }) {
  const href = `/blog/${post.slug}`;
  return (
    <article className="blog-featured site-home-reveal">
      {/* The photo repeats the article link for pointer users; the button below is the single keyboard stop. */}
      <Link href={href} className="blog-featured__media" aria-hidden="true" tabIndex={-1}>
        <Photo image={post.cover} ratio="16 / 10" className="blog-featured__photo" sizes="(min-width: 900px) 760px, 100vw" priority />
      </Link>
      <div className="blog-featured__panel">
        <BlogMeta post={post} tone="dark" />
        <h2 className="blog-featured__title">{post.title}</h2>
        <p className="blog-featured__excerpt">{post.excerpt}</p>
        <div className="blog-featured__action">
          <SiteButton href={href} variant="gold">
            {BLOG_PAGE.featuredCta}
            <ArrowRight aria-hidden="true" />
          </SiteButton>
        </div>
      </div>
    </article>
  );
}

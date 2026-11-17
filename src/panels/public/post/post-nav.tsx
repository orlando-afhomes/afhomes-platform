import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BLOG_POST_PAGE, BLOG_POSTS, type BlogPost } from "@/modules/public-site/content/blog";
import { Photo } from "../site/blocks";

function NavCard({ post, label, direction }: { post: BlogPost; label: string; direction: "older" | "newer" }) {
  const Arrow = direction === "older" ? ArrowLeft : ArrowRight;
  return (
    <Link href={`/blog/${post.slug}`} className={`post-nav__card post-nav__card--${direction}`}>
      <Arrow aria-hidden="true" className="post-nav__arrow" />
      {/* Decorative thumbnail: the title already names the post. */}
      <Photo image={{ src: post.cover.src, alt: "" }} ratio="4 / 3" className="post-nav__thumb" sizes="64px" />
      <span className="post-nav__text">
        <span className="post-nav__label">{label}</span>
        <span className="post-nav__title">{post.title}</span>
      </span>
    </Link>
  );
}

/** Older and newer post links, plus the way back to the blog. BLOG_POSTS is newest first. */
export function PostNav({ post }: { post: BlogPost }) {
  const index = BLOG_POSTS.findIndex((item) => item.slug === post.slug);
  const newer = index > 0 ? BLOG_POSTS[index - 1] : null;
  const older = index >= 0 && index < BLOG_POSTS.length - 1 ? BLOG_POSTS[index + 1] : null;
  return (
    <nav className="post-nav" aria-label="More posts">
      {older ? <NavCard post={older} label={BLOG_POST_PAGE.olderLabel} direction="older" /> : null}
      {newer ? <NavCard post={newer} label={BLOG_POST_PAGE.newerLabel} direction="newer" /> : null}
      <Link href="/blog" className="post-nav__all">
        {BLOG_POST_PAGE.allArticles}
        <ArrowRight aria-hidden="true" className="post-nav__all-icon" />
      </Link>
    </nav>
  );
}

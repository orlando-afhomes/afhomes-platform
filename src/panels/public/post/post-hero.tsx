import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { BLOG_POST_PAGE, blogReadingMinutes, formatBlogDate, type BlogPost } from "@/modules/public-site/content/blog";
import { Photo } from "../site/blocks";
import { PostShare } from "./post-share";

/** Top of a blog post: a darkened copy of the cover behind the title and intro, and the whole cover in a white frame. */
export function PostHero({ post }: { post: BlogPost }) {
  return (
    <section className="post-hero">
      <Photo image={{ src: post.cover.src, alt: "" }} ratio="auto" sizes="100vw" className="post-hero__backdrop" />
      <span className="post-hero__shade" aria-hidden="true" />
      <div className="post-hero__inner">
        <div className="post-hero__text">
          <Link href="/blog" className="post-hero__back">
            <ArrowLeft aria-hidden="true" />
            {BLOG_POST_PAGE.backLabel}
          </Link>
          <p className="post-hero__meta">
            <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
            <span aria-hidden="true"> · </span>
            {post.categories.join(", ")}
            <span aria-hidden="true"> · </span>
            {BLOG_POST_PAGE.author}
          </p>
          <h1 className="post-hero__title">{post.title}</h1>
          <p className="post-hero__intro">{post.excerpt}</p>
          <div className="post-hero__actions">
            <span className="post-hero__chip">
              <CalendarClock aria-hidden="true" />
              {blogReadingMinutes(post)} min read
            </span>
            <div className="post-hero__share">
              <span className="post-hero__share-label">{BLOG_POST_PAGE.shareLabel}</span>
              <PostShare title={post.title} path={`/blog/${post.slug}`} />
            </div>
          </div>
        </div>
        <div className="post-hero__frame">
          <Photo image={post.cover} ratio="16 / 10" fit="contain" priority sizes="(min-width: 900px) 520px, 100vw" className="post-hero__cover" />
        </div>
      </div>
    </section>
  );
}

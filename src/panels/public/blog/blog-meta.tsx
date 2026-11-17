import { CalendarDays } from "lucide-react";
import { formatBlogDate, type BlogPost } from "@/modules/public-site/content/blog";
import { cn } from "@/shared/lib/utils";

/** A post's first category as a small gold pill, then its date with a calendar icon. Shared by the featured post and the story cards. */
export function BlogMeta({ post, tone = "light", className }: { post: BlogPost; tone?: "light" | "dark"; className?: string }) {
  return (
    <div className={cn("blog-meta", `blog-meta--${tone}`, className)}>
      <span className="blog-meta__category">{post.categories[0]}</span>
      <span className="blog-meta__date">
        <CalendarDays aria-hidden="true" className="blog-meta__icon" />
        <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
      </span>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BLOG_POST_PAGE, formatBlogDate, getRelatedPosts, type BlogPost } from "@/modules/public-site/content/blog";
import { Photo } from "../site/blocks";

/** Three compact cards for other stories, same category first; the title link covers the whole card. */
export function PostRelated({ post }: { post: BlogPost }) {
  const related = getRelatedPosts(post, 3);
  if (related.length === 0) return null;
  return (
    <section className="post-related" aria-labelledby="post-related-title">
      <h2 id="post-related-title" className="post-related__title">{BLOG_POST_PAGE.relatedTitle}</h2>
      <ul className="post-related__grid">
        {related.map((item) => (
          <li key={item.slug} className="post-related__card">
            <Photo image={item.cover} ratio="16 / 9" className="post-related__photo" sizes="(min-width: 900px) 360px, (min-width: 600px) 50vw, 100vw" />
            <div className="post-related__body">
              {item.categories[0] ? <p className="post-related__category">{item.categories[0]}</p> : null}
              <h3 className="post-related__heading">
                <Link href={`/blog/${item.slug}`} className="post-related__link">{item.title}</Link>
              </h3>
              <div className="post-related__meta">
                <time dateTime={item.date} className="post-related__date">{formatBlogDate(item.date)}</time>
                <span className="post-related__arrow" aria-hidden="true"><ArrowRight /></span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

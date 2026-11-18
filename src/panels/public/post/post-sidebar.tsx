"use client";

import { useEffect, useState } from "react";
import { Award, BookOpen, Check, Sparkles } from "lucide-react";
import { BLOG_POST_PAGE, getBlogSections, type BlogPost } from "@/modules/public-site/content/blog";
import { Photo } from "../site/blocks";

/**
 * Sidebar beside a blog post: "In this article" (with the section being read marked),
 * the event highlights and the "About the Event" card. Each card shows only when the post has content for it.
 */
export function PostSidebar({ post }: { post: BlogPost }) {
  const sections = getBlogSections(post);
  const showToc = sections.length >= 2;
  const highlights = post.highlights ?? [];
  const sectionKey = sections.map((section) => section.id).join("|");
  // Keyed by slug so moving to another post starts again at its first section.
  const [tracked, setTracked] = useState<{ slug: string; id: string } | null>(null);
  const activeId = tracked?.slug === post.slug ? tracked.id : sections[0]?.id;

  useEffect(() => {
    if (!showToc || typeof IntersectionObserver === "undefined") return;
    const ids = sectionKey.split("|");
    const headings = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = ids.find((id) => visible.has(id));
        if (first) setTracked({ slug: post.slug, id: first });
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [post.slug, sectionKey, showToc]);

  if (!showToc && highlights.length === 0 && !post.about) return null;

  return (
    <aside className={highlights.length === 0 && !post.about ? "post-sidebar post-sidebar--compact" : "post-sidebar"} aria-label="About this article">
      {showToc ? (
        <div className="post-sidebar__card post-sidebar__toc">
          <div className="post-sidebar__head">
            <span className="post-sidebar__icon" aria-hidden="true">
              <BookOpen size={15} />
            </span>
            <h2 className="post-sidebar__title">{BLOG_POST_PAGE.tocTitle}</h2>
          </div>
          <nav aria-label={BLOG_POST_PAGE.tocTitle}>
            <ol className="post-sidebar__toc-list">
              {sections.map((section) => {
                const active = section.id === activeId;
                return (
                  <li key={section.id} className="post-sidebar__toc-item">
                    <a
                      href={`#${section.id}`}
                      className={active ? "post-sidebar__toc-link post-sidebar__toc-link--active" : "post-sidebar__toc-link"}
                      aria-current={active ? "true" : undefined}
                      onClick={() => setTracked({ slug: post.slug, id: section.id })}
                    >
                      {section.title}
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      ) : null}

      {highlights.length > 0 ? (
        <section className="post-sidebar__card post-sidebar__highlights" aria-labelledby="post-sidebar-highlights">
          <Photo image={BLOG_POST_PAGE.highlightsImage} ratio="16 / 9" className="post-sidebar__photo" sizes="(min-width: 1024px) 340px, 100vw" />
          <div className="post-sidebar__highlights-body">
            <div className="post-sidebar__head">
              <span className="post-sidebar__icon" aria-hidden="true">
                <Award size={15} />
              </span>
              <h2 id="post-sidebar-highlights" className="post-sidebar__title">
                {post.highlightsTitle ?? BLOG_POST_PAGE.highlightsTitle}
              </h2>
            </div>
            <ul className="post-sidebar__checks">
              {highlights.map((item) => (
                <li key={item} className="post-sidebar__check">
                  <Check size={16} strokeWidth={2.5} className="post-sidebar__check-icon" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {post.about ? (
        <section className="post-sidebar__about" aria-labelledby="post-sidebar-about">
          <span className="post-sidebar__about-icon" aria-hidden="true">
            <Sparkles size={16} />
          </span>
          <h2 id="post-sidebar-about" className="post-sidebar__about-title">
            {BLOG_POST_PAGE.aboutTitle}
          </h2>
          <p className="post-sidebar__about-text">{post.about}</p>
        </section>
      ) : null}
    </aside>
  );
}

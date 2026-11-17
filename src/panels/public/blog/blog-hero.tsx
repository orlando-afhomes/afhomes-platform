import { CalendarDays, Leaf, Sparkles } from "lucide-react";
import { BLOG_PAGE } from "@/modules/public-site/content/blog";
import { Photo } from "../site/blocks";

const HIGHLIGHT_ICONS = { leaf: Leaf, calendar: CalendarDays, sparkles: Sparkles } as const;

/** Blog index hero: the Home hero layout, shorter, with the three topic highlights under the lede. */
export function BlogHero() {
  const { hero } = BLOG_PAGE;

  return (
    <section className="site-home-hero blog-hero">
      <Photo image={hero.image} ratio="16 / 9" priority sizes="100vw" className="site-home-hero__photo" />
      <div className="site-home-hero__shade" aria-hidden="true" />
      <div className="site-home-hero__inner blog-hero__inner">
        <p className="site-eyebrow site-eyebrow--light">{hero.eyebrow}</p>
        <h1 className="site-home-hero__title">
          {hero.titleStart} <em className="site-home-hero__accent">{hero.titleAccent}</em>
        </h1>
        <p className="site-home-hero__lede">{hero.lede}</p>
        <ul className="blog-hero__highlights">
          {hero.highlights.map((item) => {
            const Icon = HIGHLIGHT_ICONS[item.icon];
            return (
              <li key={item.title} className="blog-hero__highlight">
                <span className="blog-hero__highlight-icon" aria-hidden="true">
                  <Icon strokeWidth={1.5} />
                </span>
                <span className="blog-hero__highlight-text">
                  <span className="blog-hero__highlight-title">{item.title}</span>
                  <span className="blog-hero__highlight-line">{item.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

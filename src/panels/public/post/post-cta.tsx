import { ArrowRight } from "lucide-react";
import { BLOG_POST_PAGE } from "@/modules/public-site/content/blog";
import { Photo, SiteButton } from "../site/blocks";

/** Closing photo band; reuses the Home closing band, left-aligned, with a gold button back to the blog. */
export function PostCta() {
  const { cta } = BLOG_POST_PAGE;
  return (
    <section className="site-home-cta post-cta site-home-reveal">
      <Photo image={cta.image} ratio="16 / 9" sizes="100vw" className="site-home-cta__photo" />
      <div className="site-home-cta__shade" aria-hidden="true" />
      <div className="site-section__inner">
        <div className="site-cta">
          <h2 className="site-cta__title">{cta.title}</h2>
          <p className="site-cta__text">{cta.text}</p>
          <div className="site-cta__actions">
            <SiteButton href={cta.href} variant="gold">{cta.label} <ArrowRight aria-hidden="true" /></SiteButton>
          </div>
        </div>
      </div>
    </section>
  );
}

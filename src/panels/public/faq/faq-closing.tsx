import { ArrowRight } from "lucide-react";
import { FAQ_PAGE } from "@/modules/public-site/content/faq";
import { Photo, SiteButton } from "../site/blocks";

/** Closing photo band; reuses the Home closing band, left-aligned, with a gold italic accent and a gold pill. */
export function FaqClosing() {
  const { closing } = FAQ_PAGE;
  return (
    <section className="site-home-cta faq-closing site-home-reveal">
      <Photo image={closing.image} ratio="16 / 9" sizes="100vw" className="site-home-cta__photo" />
      <div className="site-home-cta__shade" aria-hidden="true" />
      <div className="site-section__inner">
        <div className="site-cta">
          <h2 className="site-cta__title">
            {closing.titleStart} <em className="faq-closing__accent">{closing.titleAccent}</em> {closing.titleEnd}
          </h2>
          <p className="site-cta__text">{closing.text}</p>
          <div className="site-cta__actions">
            <SiteButton href={closing.href} variant="gold">{closing.cta} <ArrowRight aria-hidden="true" /></SiteButton>
          </div>
        </div>
      </div>
    </section>
  );
}

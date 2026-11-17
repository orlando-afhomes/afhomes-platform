import { ArrowRight } from "lucide-react";
import { ABOUT } from "@/modules/public-site/content/about";
import { Photo, SiteButton } from "../site/blocks";

/** Closing photo band; reuses the Home closing band, with the button on the right on desktop. */
export function AboutClosing() {
  const { closing } = ABOUT;
  return (
    <section className="site-home-cta about-closing site-home-reveal">
      <Photo image={closing.image} ratio="16 / 9" sizes="100vw" className="site-home-cta__photo" />
      <div className="site-home-cta__shade" aria-hidden="true" />
      <div className="site-section__inner">
        <div className="site-cta">
          <div className="about-closing__copy">
            <h2 className="site-cta__title">{closing.title}</h2>
            <p className="site-cta__text">{closing.text}</p>
          </div>
          <div className="site-cta__actions">
            <SiteButton href={closing.href} variant="gold">{closing.cta} <ArrowRight aria-hidden="true" /></SiteButton>
          </div>
        </div>
      </div>
    </section>
  );
}

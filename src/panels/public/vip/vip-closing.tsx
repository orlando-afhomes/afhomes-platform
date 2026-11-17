import { ChevronRight } from "lucide-react";
import { VIP_PAGE } from "@/modules/public-site/content/vip";
import { Photo, SiteButton } from "../site/blocks";

/** Closing photo band; reuses the Home closing band, centered, with a white "Contact us" pill. */
export function VipClosing() {
  const { closing } = VIP_PAGE;
  return (
    <section className="site-home-cta vip-closing site-home-reveal">
      <Photo image={closing.image} ratio="16 / 9" sizes="100vw" className="site-home-cta__photo" />
      <div className="site-home-cta__shade" aria-hidden="true" />
      <div className="site-section__inner">
        <div className="site-cta">
          <h2 className="site-cta__title">
            {closing.titleStart} <em className="vip-closing__accent">{closing.titleAccent}</em>
          </h2>
          <p className="site-cta__text">{closing.text}</p>
          <div className="site-cta__actions">
            <SiteButton href="/contact" variant="light">Contact us <ChevronRight aria-hidden="true" /></SiteButton>
          </div>
        </div>
      </div>
    </section>
  );
}

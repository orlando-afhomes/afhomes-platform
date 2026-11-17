import { COMPLIANCE_INTRO, COMPLIANCE_PAGE } from "@/modules/public-site/content/compliance";
import { Photo } from "../site/blocks";

/** Compliance page hero: the Home hero layout, shorter, with no buttons. */
export function ComplianceHero() {
  const { eyebrow, title, image } = COMPLIANCE_PAGE.hero;
  return (
    <section className="site-home-hero compliance-hero">
      <Photo image={image} ratio="16 / 9" priority sizes="100vw" className="site-home-hero__photo" />
      <div className="site-home-hero__shade" aria-hidden="true" />
      <div className="site-home-hero__inner">
        <p className="site-eyebrow site-eyebrow--light">{eyebrow}</p>
        <h1 className="site-home-hero__title">{title}</h1>
        <p className="site-home-hero__lede">{COMPLIANCE_INTRO}</p>
      </div>
    </section>
  );
}

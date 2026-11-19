import { ABOUT } from "@/modules/public-site/content/about";
import { Photo, SiteButton } from "../site/blocks";

/** About hero: reuses the Home hero markup so both pages match, with a slightly shorter height. */
export function AboutHero() {
  const copy = ABOUT.heroCopy;
  return (
    <section className="site-home-hero about-hero">
      <Photo image={ABOUT.hero} ratio="16 / 9" priority sizes="100vw" className="site-home-hero__photo" />
      <div className="site-home-hero__shade" aria-hidden="true" />
      <div className="site-home-hero__inner">
        <p className="site-eyebrow site-eyebrow--light">{copy.eyebrow}</p>
        <h1 className="site-home-hero__title">
          <span className="site-home-hero__line">{copy.title}</span>{" "}
          <em className="site-home-hero__accent">{copy.accent}</em>
        </h1>
        <p className="site-home-hero__lede">{copy.lede}</p>
        <div className="site-hero__actions">
          <SiteButton href="/vip-privilege#cards" action="join-vip" surface="dark">Join VIP</SiteButton>
          <SiteButton href="#story" action="story" surface="dark">Our Story</SiteButton>
        </div>
      </div>
    </section>
  );
}

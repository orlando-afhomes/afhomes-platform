import { Leaf, Mountain, Waves, type LucideIcon } from "lucide-react";
import { ABOUT } from "@/modules/public-site/content/about";
import { Photo, Section, SiteButton } from "../site/blocks";

/** Icons follow the order of ABOUT.featured.features. */
const FEATURE_ICONS: LucideIcon[] = [Waves, Leaf, Mountain];

/** "Featured destination": dark green photo panel for the flagship resort. */
export function AboutFeatured() {
  const { eyebrow, title, text, href, cta, image, features } = ABOUT.featured;
  return (
    <Section className="about-featured">
      <div className="about-featured__panel site-home-reveal">
        <Photo image={image} ratio="auto" sizes="(min-width: 1280px) 1232px, 100vw" className="about-featured__photo" />
        <div className="about-featured__shade" aria-hidden="true" />
        <div className="about-featured__intro">
          <p className="site-eyebrow site-eyebrow--light">{eyebrow}</p>
          <h2 className="about-featured__title">{title}</h2>
          <p className="about-featured__text">{text}</p>
          <div className="about-featured__actions">
            <SiteButton href={href} action="explore" surface="dark" primaryTone="contrast">
              {cta}
            </SiteButton>
          </div>
        </div>
        <ul className="about-featured__features">
          {features.map((feature, index) => {
            const Icon = FEATURE_ICONS[index] ?? Leaf;
            return (
              <li key={feature.title} className="about-featured__feature">
                <Icon aria-hidden="true" strokeWidth={1.25} className="about-featured__icon" />
                <h3 className="about-featured__feature-title">{feature.title}</h3>
                <p className="about-featured__feature-text">{feature.text}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}

import { AboutHero } from "../about/about-hero";
import { AboutStory } from "../about/about-story";
import { AboutExperiences } from "../about/about-experiences";
import { AboutFeatured } from "../about/about-featured";
import { AboutTransparency } from "../about/about-transparency";
import { AboutVip } from "../about/about-vip";
import { AboutAwaits } from "../about/about-awaits";
import { AboutMission } from "../about/about-mission";
import { AboutBrand } from "../about/about-brand";
import { AboutVisit } from "../about/about-visit";
import { AboutClosing } from "../about/about-closing";
import "../about/about-hero-story.css";
import "../about/about-experiences.css";
import "../about/about-trust.css";
import "../about/about-lifestyle.css";
import "../about/about-brand-visit.css";

/**
 * About page, laid out from the owner's About reference design.
 * The wrapper reuses the Home page styling (`site-home`: floating header, serif headings, eyebrow lines, reveal);
 * `site-about` marks the About page for its own tweaks and the header's "About" underline.
 */
export function AboutPage() {
  return (
    <div className="site-home site-about">
      <AboutHero />
      <AboutStory />
      <AboutExperiences />
      <AboutFeatured />
      <AboutTransparency />
      <AboutVip />
      <AboutAwaits />
      <AboutMission />
      <AboutBrand />
      <AboutVisit />
      <AboutClosing />
    </div>
  );
}

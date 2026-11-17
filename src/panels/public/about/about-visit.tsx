import { ArrowUpRight, MapPin } from "lucide-react";
import { ABOUT } from "@/modules/public-site/content/about";
import { Photo, Section, SectionHeading, SiteButton } from "../site/blocks";

/** "Visit us": text and directions on the left, the resort map on the right. */
export function AboutVisit() {
  const { visit } = ABOUT;
  return (
    <Section className="about-visit">
      <div className="about-visit__card site-home-reveal">
        <div className="about-visit__copy">
          <SectionHeading eyebrow={visit.eyebrow} title={visit.title} text={visit.text} />
          <p className="about-visit__address">
            <MapPin aria-hidden="true" className="about-visit__address-icon" />
            <span>{visit.address}</span>
          </p>
          <div className="about-visit__actions">
            <SiteButton href={visit.directionsHref} external>
              {visit.cta} <ArrowUpRight aria-hidden="true" />
            </SiteButton>
          </div>
        </div>
        <Photo image={visit.map} ratio="16 / 10" fit="contain" className="about-visit__map" sizes="(min-width: 900px) 600px, 100vw" />
      </div>
    </Section>
  );
}

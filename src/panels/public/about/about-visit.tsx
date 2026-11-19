import { MapPin } from "lucide-react";
import { ABOUT } from "@/modules/public-site/content/about";
import { OFFICES } from "@/modules/public-site/content/site";
import { SiteMapEmbed } from "@/shared/components/site";
import { Section, SectionHeading, SiteButton } from "../site/blocks";

/** "Visit us": text and directions on the left, the live Google map of the main office (the resort) on the right. */
export function AboutVisit() {
  const { visit } = ABOUT;
  const mainOffice = OFFICES.find((office) => office.id === "head") ?? OFFICES[0];
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
            <SiteButton href={mainOffice.map.href} action="directions" external>
              {visit.cta}
            </SiteButton>
          </div>
        </div>
        <SiteMapEmbed src={mainOffice.map.embedSrc} title={`Map of the AFhomes ${mainOffice.label}`} className="about-visit__map" />
      </div>
    </Section>
  );
}

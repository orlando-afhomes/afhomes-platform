import { ArrowUpRight, MapPin } from "lucide-react";
import { OFFICES, officeMapAnchor } from "@/modules/public-site/content/site";
import { SiteMapEmbed } from "@/shared/components/site";
import { SectionHeading, SiteButton } from "../site/blocks";

/** "Find us": a live Google map for each office with its address and a directions link. */
export function ContactMaps() {
  return (
    <section id="find-us" className="contact-maps" aria-labelledby="contact-maps-title">
      <SectionHeading eyebrow="Find us" title="Our offices on the map" text="Visit our Satellite Office in Alaminos or see where our flagship resort is rising in Calauan." />
      <ul className="contact-maps__grid">
        {OFFICES.map((office) => (
          <li key={office.id} id={officeMapAnchor(office)} className="contact-maps__card">
            <SiteMapEmbed src={office.map.embedSrc} title={`Map of the AFhomes ${office.label}`} className="contact-maps__map" />
            <div className="contact-maps__body">
              <span className="contact-maps__pin" aria-hidden="true"><MapPin /></span>
              <div className="contact-maps__text">
                <h3 className="contact-maps__label">{office.label}</h3>
                <address className="contact-maps__address">
                  {office.lines.join(", ")}
                  {office.landmark ? <span className="contact-maps__landmark">{office.landmark}</span> : null}
                </address>
              </div>
              <SiteButton href={office.map.href} variant="outline" external>
                Get directions <ArrowUpRight aria-hidden="true" />
              </SiteButton>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

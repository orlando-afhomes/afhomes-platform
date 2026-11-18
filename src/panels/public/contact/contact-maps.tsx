import { ArrowUpRight, MapPin, Navigation } from "lucide-react";
import { OFFICES, officeMapAnchor } from "@/modules/public-site/content/site";
import { Photo, SectionHeading, SiteButton } from "../site/blocks";

/** "Find us": a static route map for each office, a concise address, directions and an open-map link. */
export function ContactMaps() {
  return (
    <section id="find-us" className="contact-maps">
      <SectionHeading eyebrow="Find us" title="Our offices on the map" text="Visit our Satellite Office in Alaminos or see where our flagship resort is rising in Calauan." />
      <ul className="contact-maps__grid">
        {OFFICES.map((office) => (
          <li key={office.id} id={officeMapAnchor(office)} className="contact-maps__card">
            <div className="contact-maps__media">
              <Photo image={office.map.image} ratio="4 / 3" fit="contain" sizes="(min-width: 1024px) 560px, (min-width: 640px) 40vw, 100vw" className="contact-maps__photo" />
              <h3 className="contact-maps__label">
                <MapPin aria-hidden="true" />
                {office.label}
              </h3>
            </div>
            <div className="contact-maps__body">
              <address className="contact-maps__address">{office.shortAddress}</address>
              {office.landmark ? <p className="contact-maps__landmark">{office.landmark}</p> : null}
              <div className="contact-maps__actions">
                <SiteButton href={office.map.directionsHref} variant="primary" external>
                  Get directions <Navigation aria-hidden="true" />
                </SiteButton>
                <SiteButton href={office.map.href} variant="outline" external>
                  Open map <ArrowUpRight aria-hidden="true" />
                </SiteButton>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

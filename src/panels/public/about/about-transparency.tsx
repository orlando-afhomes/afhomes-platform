import { Check } from "lucide-react";
import { ABOUT } from "@/modules/public-site/content/about";
import { Photo, Section, SectionHeading, SiteButton } from "../site/blocks";

/** "Commitment to Transparency": compliance graphic on the left, points and registrations on the right. */
export function AboutTransparency() {
  const { transparency, registrations } = ABOUT;
  return (
    <Section className="about-transparency">
      <div className="about-transparency__layout">
        <div className="about-transparency__frame site-home-reveal">
          {/* The graphic is 1600 by 1120, so a 10 / 7 box shows all of it without cropping. */}
          <Photo image={transparency.image} ratio="10 / 7" className="about-transparency__photo" sizes="(min-width: 900px) 600px, 100vw" />
        </div>
        <div className="about-transparency__body site-home-reveal">
          <SectionHeading eyebrow={transparency.eyebrow} title={transparency.title} text={transparency.text} />
          <ul className="about-transparency__points">
            {transparency.points.map((point) => (
              <li key={point} className="about-transparency__point">
                <span className="about-transparency__check" aria-hidden="true"><Check /></span>
                {point}
              </li>
            ))}
          </ul>
          <ul className="about-transparency__registrations" aria-label="Company registrations">
            {registrations.map((item) => (
              <li key={item.label} className="about-transparency__registration">
                <Photo image={item.image} ratio="1 / 1" fit="contain" className="about-transparency__logo" sizes="40px" />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
          <div className="about-transparency__actions">
            <SiteButton href={transparency.href} action="verify">
              {transparency.cta}
            </SiteButton>
          </div>
        </div>
      </div>
    </Section>
  );
}

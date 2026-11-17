import { ABOUT } from "@/modules/public-site/content/about";
import { Photo, Section, SectionHeading } from "../site/blocks";

/** "Our brand": logo meaning on the left, the full logo on the right. */
export function AboutBrand() {
  const { logo } = ABOUT;
  return (
    <Section className="about-brand">
      <div className="about-brand__layout site-home-reveal">
        <div className="about-brand__copy">
          <SectionHeading eyebrow={logo.eyebrow} title={logo.title} text={logo.text} />
          <ul className="about-brand__parts">
            {logo.parts.map((part) => (
              <li key={part.title} className="about-brand__part">
                <h3 className="about-brand__part-title">{part.title}</h3>
                <p className="about-brand__part-text">{part.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <Photo image={logo.image} ratio="1 / 1" fit="contain" className="about-brand__logo" sizes="(min-width: 900px) 360px, 70vw" />
      </div>
    </Section>
  );
}

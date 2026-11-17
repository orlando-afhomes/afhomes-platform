import { ABOUT } from "@/modules/public-site/content/about";
import { SiteFeatureCard } from "@/shared/components/site";
import { Section, SectionHeading } from "../site/blocks";

/** "Our experiences": the three AFhomes destinations as photo cards. */
export function AboutExperiences() {
  const { eyebrow, title, text, cards } = ABOUT.experiences;
  return (
    <Section tone="soft" className="about-experiences">
      <SectionHeading eyebrow={eyebrow} title={title} text={text} />
      <ul className="site-grid site-grid--3 about-experiences__grid">
        {cards.map((card) => (
          <li key={card.href} className="site-home-reveal">
            <SiteFeatureCard href={card.href} title={card.title} text={card.text} image={card.image} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

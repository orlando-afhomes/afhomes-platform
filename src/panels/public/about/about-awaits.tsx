import { ABOUT } from "@/modules/public-site/content/about";
import { Photo, Section, SectionHeading } from "@/panels/public/site/blocks";

/** "What Awaits at the Resort": four photo cards in a row. */
export function AboutAwaits() {
  const { eyebrow, title, text, items } = ABOUT.awaits;
  return (
    <Section className="about-awaits">
      <SectionHeading eyebrow={eyebrow} title={title} text={text} />
      <ul className="about-awaits__list site-home-reveal">
        {items.map((item) => (
          <li key={item.title} className="about-awaits__card">
            <Photo image={item.image} ratio="4 / 3" className="about-awaits__photo" sizes="(min-width: 1024px) 300px, (min-width: 560px) 50vw, 100vw" />
            <div className="about-awaits__body">
              <h3 className="about-awaits__title">{item.title}</h3>
              <p className="about-awaits__text">{item.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

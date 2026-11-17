import { Eye, Target } from "lucide-react";
import { ABOUT } from "@/modules/public-site/content/about";
import { Section } from "@/panels/public/site/blocks";

/** Our Mission and Our Vision: the official company statements, word for word. */
export function AboutMission() {
  const cards = [
    { title: "Our Mission", text: ABOUT.mission, Icon: Target },
    { title: "Our Vision", text: ABOUT.vision, Icon: Eye },
  ];
  return (
    <Section className="about-mission">
      <ul className="about-mission__list site-home-reveal">
        {cards.map(({ title, text, Icon }) => (
          <li key={title} className="about-mission__card">
            <span className="about-mission__icon" aria-hidden="true">
              <Icon strokeWidth={1.4} />
            </span>
            <div className="about-mission__body">
              <h3 className="about-mission__title">{title}</h3>
              <p className="about-mission__text">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

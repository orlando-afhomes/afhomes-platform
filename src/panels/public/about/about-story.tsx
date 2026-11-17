import { Gem, Leaf, Users } from "lucide-react";
import { ABOUT } from "@/modules/public-site/content/about";
import { Photo, Section, SectionHeading } from "../site/blocks";

const VALUE_ICONS = [Leaf, Users, Gem];

/** "The AFhomes Story": text beside a large photo, then three value cards. */
export function AboutStory() {
  const story = ABOUT.story;
  return (
    <Section id="story" className="about-story">
      <div className="about-story__intro site-home-reveal">
        <div className="about-story__text">
          <SectionHeading eyebrow={story.eyebrow} title={story.title} />
          {story.paragraphs.map((paragraph) => (
            <p key={paragraph} className="about-story__paragraph">{paragraph}</p>
          ))}
        </div>
        <Photo image={story.image} ratio="16 / 10" className="about-story__media" sizes="(min-width: 900px) 560px, 100vw" />
      </div>
      <ul className="about-story__values site-home-reveal">
        {story.values.map((value, index) => {
          const Icon = VALUE_ICONS[index] ?? Leaf;
          return (
            <li key={value.title} className="about-story__value">
              <Icon className="about-story__value-icon" aria-hidden="true" strokeWidth={1.25} />
              <div>
                <h3 className="about-story__value-title">{value.title}</h3>
                <p className="about-story__value-text">{value.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

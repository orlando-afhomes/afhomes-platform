import type { Highlight } from "@/modules/public-site/content/experiences";
import { cn } from "@/shared/lib/utils";
import { Photo, Section, SectionHeading } from "../site/blocks";

/** A row of photo cards (resort lifestyle, hotel lounge). Columns follow the item count, up to four. */
export function ExperiencePhotoCards({ id, eyebrow, title, text, items, tone = "soft" }: { id?: string; eyebrow: string; title: string; text?: string; items: Highlight[]; tone?: "plain" | "soft" }) {
  const columns = Math.min(Math.max(items.length, 1), 4);
  return (
    <Section id={id} tone={tone} className="exp-cards">
      <SectionHeading eyebrow={eyebrow} title={title} text={text} />
      <ul className={cn("exp-cards__grid", `exp-cards__grid--${columns}`)}>
        {items.map((item) => (
          <li key={item.title} className="exp-cards__card">
            {item.image ? <Photo image={item.image} ratio="16 / 10" className="exp-cards__photo" sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw" /> : null}
            <div className="exp-cards__body">
              <h3 className="exp-cards__title">{item.title}</h3>
              <p className="exp-cards__text">{item.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

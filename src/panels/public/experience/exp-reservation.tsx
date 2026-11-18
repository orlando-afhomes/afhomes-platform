import type { ReactNode } from "react";
import { CalendarCheck } from "lucide-react";
import type { SiteImage } from "@/modules/public-site/content/experiences";
import { Photo, Section } from "../site/blocks";

/** Restaurant reservation panel: large photo left, text, reservation note and actions right. */
export function RestaurantReservation({ id, eyebrow, title, text, note, image, children }: { id?: string; eyebrow: string; title: string; text: string; note: string; image: SiteImage; children?: ReactNode }) {
  return (
    <Section id={id} tone="soft" className="exp-reservation">
      <div className="exp-reservation__panel">
        <Photo image={image} ratio="3 / 2" className="exp-reservation__photo" sizes="(min-width: 900px) 720px, 100vw" />
        <div className="exp-reservation__body">
          <p className="site-eyebrow">{eyebrow}</p>
          <h2 className="exp-reservation__title">{title}</h2>
          <p className="exp-reservation__text">{text}</p>
          <p className="exp-reservation__note">
            <CalendarCheck aria-hidden="true" className="exp-reservation__note-icon" />
            <span>{note}</span>
          </p>
          {children ? <div className="exp-reservation__actions">{children}</div> : null}
        </div>
      </div>
    </Section>
  );
}

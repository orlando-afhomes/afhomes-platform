"use client";

import { useState } from "react";
import type { SiteImage } from "@/modules/public-site/content/experiences";
import { Photo, RenderingsNote, Section, SectionHeading } from "../site/blocks";
import { PhotoLightbox } from "./photo-lightbox";

/** Amenities: heading plus a tight photo grid; each photo opens in the shared viewer. */
export function ExperienceAmenities({ id, eyebrow, title, text, images }: { id?: string; eyebrow: string; title: string; text: string; images: SiteImage[] }) {
  const [active, setActive] = useState<number | null>(null);
  return (
    <Section id={id} className="exp-amenities">
      <SectionHeading eyebrow={eyebrow} title={title} text={text} />
      <ul className="exp-amenities__grid" aria-label={title}>
        {images.map((image, index) => (
          <li key={image.src}>
            <button type="button" className="exp-amenities__item" onClick={() => setActive(index)} aria-label={`Enlarge: ${image.alt}`}>
              <Photo image={image} ratio="4 / 3" className="exp-amenities__photo" sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw" />
            </button>
          </li>
        ))}
      </ul>
      <RenderingsNote />
      <PhotoLightbox images={images} index={active} onIndexChange={setActive} />
    </Section>
  );
}

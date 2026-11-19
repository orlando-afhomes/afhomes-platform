"use client";

import { useState } from "react";
import type { SiteImage } from "@/modules/public-site/content/experiences";
import { Photo, Section, SectionHeading } from "../site/blocks";
import { PhotoLightbox } from "./photo-lightbox";

/** Hotel photos (one large, two stacked) that open in the shared viewer, then the sleep apnea card. */
export function HotelGallery({ id, eyebrow, title, images, apnea }: { id?: string; eyebrow: string; title: string; images: SiteImage[]; apnea: { title: string; text: string; image: SiteImage } }) {
  const [active, setActive] = useState<number | null>(null);
  return (
    <Section id={id} className="exp-hotel-gallery">
      <SectionHeading eyebrow={eyebrow} title={title} />
      <ul className="exp-hotel-gallery__grid" aria-label={title}>
        {images.map((image, index) => (
          <li key={image.src} className="exp-hotel-gallery__cell">
            <button type="button" className="exp-hotel-gallery__item" onClick={() => setActive(index)} aria-label={`Enlarge: ${image.alt}`}>
              <Photo image={image} ratio="4 / 3" className="exp-hotel-gallery__photo" sizes={index === 0 ? "(min-width: 900px) 760px, 100vw" : "(min-width: 900px) 480px, 100vw"} />
            </button>
          </li>
        ))}
      </ul>

      <article className="exp-apnea">
        <div className="exp-apnea__text">
          <h3 className="exp-apnea__title">{apnea.title}</h3>
          <p className="exp-apnea__body">{apnea.text}</p>
        </div>
        <div className="exp-apnea__banner">
          <Photo image={apnea.image} ratio="1600 / 390" fit="contain" className="exp-apnea__photo" sizes="(min-width: 1280px) 1200px, 100vw" />
        </div>
      </article>

      <PhotoLightbox images={images} index={active} onIndexChange={setActive} />
    </Section>
  );
}

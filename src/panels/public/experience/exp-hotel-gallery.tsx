"use client";

import { useState } from "react";
import Image from "next/image";
import type { SiteImage } from "@/modules/public-site/content/experiences";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Photo, Section, SectionHeading } from "../site/blocks";

/** Hotel photos (one large, two stacked) that open in a lightbox, then the sleep apnea card. */
export function HotelGallery({ id, eyebrow, title, images, apnea }: { id?: string; eyebrow: string; title: string; images: SiteImage[]; apnea: { title: string; text: string; image: SiteImage } }) {
  const [active, setActive] = useState<SiteImage | null>(null);
  return (
    <Section id={id} className="exp-hotel-gallery">
      <SectionHeading eyebrow={eyebrow} title={title} />
      <ul className="exp-hotel-gallery__grid" aria-label={title}>
        {images.map((image, index) => (
          <li key={image.src} className="exp-hotel-gallery__cell">
            <button type="button" className="exp-hotel-gallery__item" onClick={() => setActive(image)} aria-label={`Enlarge: ${image.alt}`}>
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

      <Dialog open={active !== null} onOpenChange={(open) => (open ? null : setActive(null))}>
        <DialogContent className="site-lightbox">
          <DialogHeader>
            <DialogTitle>{active?.alt}</DialogTitle>
            <DialogDescription className="tw:sr-only">Enlarged photo</DialogDescription>
          </DialogHeader>
          {active ? (
            <span className="site-lightbox__frame">
              <Image src={active.src} alt={active.alt} fill sizes="(min-width: 1024px) 900px, 100vw" className="site-photo__image site-photo__image--contain" />
            </span>
          ) : null}
        </DialogContent>
      </Dialog>
    </Section>
  );
}

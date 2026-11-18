"use client";

import { useState } from "react";
import Image from "next/image";
import type { SiteImage } from "@/modules/public-site/content/experiences";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Photo, RenderingsNote, Section, SectionHeading } from "../site/blocks";

/** Amenities: heading plus a tight photo grid; each photo opens larger in a dialog. */
export function ExperienceAmenities({ id, eyebrow, title, text, images }: { id?: string; eyebrow: string; title: string; text: string; images: SiteImage[] }) {
  const [active, setActive] = useState<SiteImage | null>(null);
  return (
    <Section id={id} className="exp-amenities">
      <SectionHeading eyebrow={eyebrow} title={title} text={text} />
      <ul className="exp-amenities__grid" aria-label={title}>
        {images.map((image) => (
          <li key={image.src}>
            <button type="button" className="exp-amenities__item" onClick={() => setActive(image)} aria-label={`Enlarge: ${image.alt}`}>
              <Photo image={image} ratio="4 / 3" className="exp-amenities__photo" sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw" />
            </button>
          </li>
        ))}
      </ul>
      <RenderingsNote />
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

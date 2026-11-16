"use client";

import { useState } from "react";
import Image from "next/image";
import type { Room, RoomCategory, SiteImage } from "@/modules/public-site/content/experiences";
import { ROOM_FILTERS } from "@/modules/public-site/content/experiences";
import { cn } from "@/shared/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Photo } from "./blocks";

/** Photo grid; each photo opens larger in a dialog. */
export function ImageGallery({ images, label, columns = 3 }: { images: SiteImage[]; label: string; columns?: 2 | 3 | 4 }) {
  const [active, setActive] = useState<SiteImage | null>(null);
  return (
    <>
      <ul className={cn("site-gallery", `site-gallery--${columns}`)} aria-label={label}>
        {images.map((image) => (
          <li key={image.src}>
            <button type="button" className="site-gallery__item" onClick={() => setActive(image)} aria-label={`Enlarge: ${image.alt}`}>
              <Photo image={image} ratio="4 / 3" sizes="(min-width: 1024px) 360px, 50vw" />
            </button>
          </li>
        ))}
      </ul>
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
    </>
  );
}

/** Villas, A-Frames and glamping with a filter, as on the old resort page. */
export function RoomExplorer({ rooms }: { rooms: Room[] }) {
  const [filter, setFilter] = useState<"all" | RoomCategory>("all");
  const visible = rooms.filter((room) => filter === "all" || room.category === filter);
  return (
    <div>
      <div className="site-filter" role="group" aria-label="Filter accommodations">
        {ROOM_FILTERS.map((option) => (
          <button key={option.value} type="button" aria-pressed={filter === option.value} onClick={() => setFilter(option.value)} className="site-filter__button">
            {option.label}
          </button>
        ))}
      </div>
      <ul className="site-rooms">
        {visible.map((room) => (
          <li key={room.id} className="site-room">
            <h3 className="site-room__title">{room.name}</h3>
            <ImageGallery images={room.photos} label={`${room.name} photos`} columns={3} />
            {room.floorPlan ? (
              <div className="site-room__plan">
                <p className="site-room__plan-label">Floor plan</p>
                <ImageGallery images={[room.floorPlan]} label={`${room.name} floor plan`} columns={2} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

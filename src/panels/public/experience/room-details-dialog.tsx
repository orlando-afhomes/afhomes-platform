"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Room, SiteImage } from "@/modules/public-site/content/experiences";
import { ROOM_CATEGORY_LABELS } from "@/modules/public-site/content/experiences";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Photo } from "../site/blocks";

/** All pictures of a room: photos first, then the floor plan. */
export function roomImages(room: Room): SiteImage[] {
  return room.floorPlan ? [...room.photos, room.floorPlan] : room.photos;
}

/**
 * Reusable room photo/floor-plan gallery. Used by the resort room cards and the Home accommodations preview.
 * Key it by the room id at the call site so each room opens on its main photo.
 */
export function RoomDetailsDialog({ room, open, onOpenChange }: { room: Room | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [index, setIndex] = useState(0);
  const images = room ? roomImages(room) : [];
  const safeIndex = images.length ? Math.min(index, images.length - 1) : 0;
  const shown = images[safeIndex];

  // Focus the stage as soon as the portal mounts so the dialog traps the keyboard immediately.
  function focusStage(node: HTMLDivElement | null) {
    node?.focus();
  }

  function step(delta: number) {
    if (images.length < 2) return;
    setIndex((current) => (Math.min(current, images.length - 1) + delta + images.length) % images.length);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="site-lightbox exp-rooms__dialog"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            step(-1);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            step(1);
          }
        }}
      >
        <DialogHeader className="exp-rooms__head">
          <div className="exp-rooms__heading">
            {room ? <p className="exp-rooms__tag">{ROOM_CATEGORY_LABELS[room.category]}</p> : null}
            <DialogTitle className="exp-rooms__title">{room?.name}</DialogTitle>
            <DialogDescription className="tw:sr-only">Photos and floor plan</DialogDescription>
          </div>
          {images.length > 1 ? (
            <p className="exp-rooms__count" aria-live="polite">{safeIndex + 1} / {images.length}</p>
          ) : null}
        </DialogHeader>
        {room && shown ? (
          <>
            <div ref={focusStage} tabIndex={-1} className="exp-rooms__stage" aria-label={room ? `${room.name} photos` : undefined}>
              <Image src={shown.src} alt="" fill sizes="10vw" aria-hidden="true" className="exp-rooms__backdrop" />
              <Image
                src={shown.src}
                alt={shown.alt}
                fill
                sizes="(min-width: 1024px) 1000px, 100vw"
                className="site-photo__image site-photo__image--contain exp-rooms__image"
              />
              {images.length > 1 ? (
                <>
                  <button type="button" className="exp-rooms__nav exp-rooms__nav--prev" aria-label="Previous picture" onClick={() => step(-1)}>
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <button type="button" className="exp-rooms__nav exp-rooms__nav--next" aria-label="Next picture" onClick={() => step(1)}>
                    <ChevronRight aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>
            {images.length > 1 ? (
              <ul className="exp-rooms__picker" aria-label={`${room.name} pictures`}>
                {images.map((image, imageIndex) => (
                  <li key={image.src}>
                    <button
                      type="button"
                      className="exp-rooms__pick"
                      aria-pressed={imageIndex === safeIndex}
                      aria-label={`Show: ${image.alt}`}
                      onClick={() => setIndex(imageIndex)}
                    >
                      <Photo image={image} ratio="4 / 3" sizes="96px" />
                      {image.alt.toLowerCase().includes("floor plan") ? <span className="exp-rooms__pick-tag">Floor plan</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

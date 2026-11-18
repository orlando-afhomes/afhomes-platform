"use client";

import { useState } from "react";
import Image from "next/image";
import type { Room, SiteImage } from "@/modules/public-site/content/experiences";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Photo } from "../site/blocks";

/** All pictures of a room: photos first, then the floor plan. */
export function roomImages(room: Room): SiteImage[] {
  return room.floorPlan ? [...room.photos, room.floorPlan] : room.photos;
}

/**
 * Reusable room photo/floor-plan dialog. Used by the resort room cards and the Home accommodations preview.
 * Key it by the room id at the call site so each room opens on its main photo.
 */
export function RoomDetailsDialog({ room, open, onOpenChange }: { room: Room | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [index, setIndex] = useState(0);
  const images = room ? roomImages(room) : [];
  const safeIndex = images.length ? Math.min(index, images.length - 1) : 0;
  const shown = images[safeIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="site-lightbox exp-rooms__dialog">
        <DialogHeader>
          <DialogTitle>{room?.name}</DialogTitle>
          <DialogDescription className="tw:sr-only">Photos and floor plan</DialogDescription>
        </DialogHeader>
        {room && shown ? (
          <>
            <span className="site-lightbox__frame exp-rooms__frame">
              <Image src={shown.src} alt={shown.alt} fill sizes="(min-width: 1024px) 900px, 100vw" className="site-photo__image site-photo__image--contain" />
            </span>
            {images.length > 1 ? (
              <ul className="exp-rooms__picker" aria-label={`${room.name} pictures`}>
                {images.map((image, imageIndex) => (
                  <li key={image.src}>
                    <button type="button" className="exp-rooms__pick" aria-pressed={imageIndex === safeIndex} aria-label={`Show: ${image.alt}`} onClick={() => setIndex(imageIndex)}>
                      <Photo image={image} ratio="4 / 3" sizes="96px" />
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

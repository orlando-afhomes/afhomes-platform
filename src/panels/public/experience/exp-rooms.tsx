"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, Images, LayoutDashboard } from "lucide-react";
import type { Room, SiteImage } from "@/modules/public-site/content/experiences";
import { ROOM_CATEGORY_LABELS } from "@/modules/public-site/content/experiences";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Photo, RenderingsNote, Section, SectionHeading } from "../site/blocks";

/** All pictures of a room: photos first, then the floor plan. */
function roomImages(room: Room): SiteImage[] {
  return room.floorPlan ? [...room.photos, room.floorPlan] : room.photos;
}

/** Accommodation cards; each opens a dialog to browse the room's photos and floor plan. */
export function ExperienceRooms({ id, eyebrow, title, text, note, rooms }: { id?: string; eyebrow: string; title: string; text: string; note: string; rooms: Room[] }) {
  const [open, setOpen] = useState<{ room: Room; index: number } | null>(null);
  const images = open ? roomImages(open.room) : [];
  const shown = images[open?.index ?? 0];

  return (
    <Section id={id} tone="soft" className="exp-rooms">
      <SectionHeading eyebrow={eyebrow} title={title} text={text} />
      <ul className="exp-rooms__grid">
        {rooms.map((room) => {
          const all = roomImages(room);
          const main = room.photos[0];
          const thumbs = all.slice(1, 4);
          const photoCount = room.photos.length;
          return (
            <li key={room.id} className="exp-rooms__card">
              <div className="exp-rooms__media">
                {main ? <Photo image={main} ratio="16 / 9" className="exp-rooms__main" sizes="(min-width: 900px) 400px, 100vw" /> : null}
                {thumbs.length > 0 ? (
                  <ul className="exp-rooms__thumbs" aria-label={`${room.name} pictures`}>
                    {thumbs.map((image, offset) => (
                      <li key={image.src}>
                        <button type="button" className="exp-rooms__thumb" aria-label={`Show: ${image.alt}`} onClick={() => setOpen({ room, index: offset + 1 })}>
                          <Photo image={image} ratio="4 / 3" sizes="120px" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="exp-rooms__body">
                <p className="exp-rooms__tag">{ROOM_CATEGORY_LABELS[room.category]}</p>
                <h3 className="exp-rooms__name">{room.name}</h3>
                <ul className="exp-rooms__facts">
                  <li className="exp-rooms__fact">
                    <Images aria-hidden="true" className="exp-rooms__fact-icon" />
                    {photoCount} {photoCount === 1 ? "photo" : "photos"}
                  </li>
                  {room.floorPlan ? (
                    <li className="exp-rooms__fact">
                      <LayoutDashboard aria-hidden="true" className="exp-rooms__fact-icon" />
                      With floor plan
                    </li>
                  ) : null}
                </ul>
                <button type="button" className="exp-rooms__view" aria-label={`View details: ${room.name}`} onClick={() => setOpen({ room, index: 0 })}>
                  View details
                  <ArrowRight aria-hidden="true" className="exp-rooms__view-icon" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="exp-rooms__note">{note}</p>
      <RenderingsNote />

      <Dialog open={open !== null} onOpenChange={(next) => (next ? null : setOpen(null))}>
        <DialogContent className="site-lightbox exp-rooms__dialog">
          <DialogHeader>
            <DialogTitle>{open?.room.name}</DialogTitle>
            <DialogDescription className="tw:sr-only">Photos and floor plan</DialogDescription>
          </DialogHeader>
          {open && shown ? (
            <>
              <span className="site-lightbox__frame exp-rooms__frame">
                <Image src={shown.src} alt={shown.alt} fill sizes="(min-width: 1024px) 900px, 100vw" className="site-photo__image site-photo__image--contain" />
              </span>
              {images.length > 1 ? (
                <ul className="exp-rooms__picker" aria-label={`${open.room.name} pictures`}>
                  {images.map((image, index) => (
                    <li key={image.src}>
                      <button type="button" className="exp-rooms__pick" aria-pressed={index === open.index} aria-label={`Show: ${image.alt}`} onClick={() => setOpen({ room: open.room, index })}>
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
    </Section>
  );
}

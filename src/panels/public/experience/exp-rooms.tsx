"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Images, LayoutDashboard } from "lucide-react";
import type { Room } from "@/modules/public-site/content/experiences";
import { ROOM_CATEGORY_LABELS } from "@/modules/public-site/content/experiences";
import { Photo, Section, SectionHeading } from "../site/blocks";
import { RoomDetailsDialog } from "./room-details-dialog";

/** Accommodation cards; each opens a dialog to browse the room's photos and floor plan. */
export function ExperienceRooms({ id, eyebrow, title, text, note, rooms }: { id?: string; eyebrow: string; title: string; text: string; note: string; rooms: Room[] }) {
  const [openRoom, setOpenRoom] = useState<Room | null>(null);

  // Deep links from the Home room cards: #room-<id> opens that room's details.
  useEffect(() => {
    const openFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const room = rooms.find((entry) => `room-${entry.id}` === id);
      if (room) setOpenRoom(room);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [rooms]);

  return (
    <Section id={id} tone="soft" className="exp-rooms">
      <SectionHeading eyebrow={eyebrow} title={title} text={text} />
      <ul className="exp-rooms__grid">
        {rooms.map((room) => {
          const main = room.photos[0];
          const photoCount = room.photos.length;
          return (
            <li key={room.id} id={`room-${room.id}`} className="exp-rooms__card">
              <div className="exp-rooms__media">
                {main ? <Photo image={main} ratio="16 / 9" className="exp-rooms__main" sizes="(min-width: 900px) 400px, 100vw" /> : null}
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
                <button type="button" className="exp-rooms__view" aria-label={`View details: ${room.name}`} onClick={() => setOpenRoom(room)}>
                  View details
                  <ArrowRight aria-hidden="true" className="exp-rooms__view-icon" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="exp-rooms__note">{note}</p>

      <RoomDetailsDialog
        key={openRoom?.id ?? "closed"}
        room={openRoom}
        open={openRoom !== null}
        onOpenChange={(next) => { if (!next) setOpenRoom(null); }}
      />
    </Section>
  );
}

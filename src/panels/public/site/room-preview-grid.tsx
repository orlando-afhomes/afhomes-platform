"use client";

import { useState } from "react";
import { House, Tent, TreePine } from "lucide-react";
import { ROOM_CATEGORY_LABELS, type Room } from "@/modules/public-site/content/experiences";
import { SiteRoomCard } from "@/shared/components/site";
import { RoomDetailsDialog } from "../experience/room-details-dialog";

const ROOM_ICONS = { villa: <House />, "a-frame": <TreePine />, glamping: <Tent /> };

/** Home accommodations preview: linked room cards whose arrow opens the same details dialog in place. */
export function RoomPreviewGrid({ rooms }: { rooms: Room[] }) {
  const [openRoom, setOpenRoom] = useState<Room | null>(null);

  return (
    <>
      <ul className="site-room-grid site-home-reveal" aria-label="Accommodations preview">
        {rooms.map((room) => (
          <li key={room.id}>
            <SiteRoomCard
              name={room.name}
              category={ROOM_CATEGORY_LABELS[room.category]}
              icon={ROOM_ICONS[room.category]}
              image={room.photos[0]}
              onSelect={() => setOpenRoom(room)}
            />
          </li>
        ))}
      </ul>
      <RoomDetailsDialog
        key={openRoom?.id ?? "closed"}
        room={openRoom}
        open={openRoom !== null}
        onOpenChange={(next) => { if (!next) setOpenRoom(null); }}
      />
    </>
  );
}

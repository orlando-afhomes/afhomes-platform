import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type SiteRoomCardBase = {
  name: string;
  /** Short type shown above the name, for example "Villa". */
  category: string;
  /** Small icon shown in the type badge. */
  icon?: ReactNode;
  image: { src: string; alt: string };
  sizes?: string;
  className?: string;
};

/** Link mode navigates; `onSelect` mode makes the whole card a button that opens details in place. */
export type SiteRoomCardProps = SiteRoomCardBase & ({ href: string; onSelect?: never } | { onSelect: () => void; href?: never });

/**
 * Linked accommodation card: the whole photo (never cropped) on a soft blurred backdrop, then the room type badge, name and arrow.
 * Put these inside `.site-room-grid`.
 */
export function SiteRoomCard(props: SiteRoomCardProps) {
  const { name, category, icon, image, sizes = "(min-width: 900px) 400px, (min-width: 560px) 50vw, 100vw", className } = props;
  const label = `${name}: view details`;
  const content = (
    <>
      <span className="site-room-card__media">
        {/* Blurred copy fills any gap around the full (contained) photo */}
        <Image src={image.src} alt="" fill sizes="10vw" className="site-room-card__backdrop" aria-hidden="true" />
        <Image src={image.src} alt={image.alt} fill sizes={sizes} className="site-room-card__image" />
      </span>
      <span className="site-room-card__panel">
        {icon ? <span className="site-room-card__icon" aria-hidden="true">{icon}</span> : null}
        <span className="site-room-card__text">
          <span className="site-room-card__category">{category}</span>
          <span className="site-room-card__name">{name}</span>
        </span>
      </span>
    </>
  );

  return (
    <div className={cn("site-room-card", className)}>
      {"onSelect" in props ? (
        <button type="button" className="site-room-card__link" aria-label={label} onClick={props.onSelect}>
          {content}
          <span className="site-room-card__arrow" aria-hidden="true"><ArrowRight /></span>
        </button>
      ) : (
        <Link href={props.href} className="site-room-card__link" aria-label={label}>
          {content}
          <span className="site-room-card__arrow" aria-hidden="true"><ArrowRight /></span>
        </Link>
      )}
    </div>
  );
}

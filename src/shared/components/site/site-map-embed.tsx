import { cn } from "@/shared/lib/utils";

export type SiteMapEmbedProps = {
  /** A Google Maps embed URL (https://www.google.com/maps/embed?pb=...). */
  src: string;
  /** Accessible name for the map frame, e.g. "Map of the Satellite Office". */
  title: string;
  className?: string;
};

/** Lazy-loaded Google Maps embed that fills its box. Give the parent a size or let the 4/3 default apply. */
export function SiteMapEmbed({ src, title, className }: SiteMapEmbedProps) {
  return (
    <div className={cn("site-map-embed", className)}>
      <iframe
        src={src}
        title={title}
        className="site-map-embed__frame"
        loading="lazy"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

import type { ReactNode } from "react";
import type { SiteImage } from "@/modules/public-site/content/experiences";
import { cn } from "@/shared/lib/utils";
import { Photo } from "./blocks";

/**
 * Shared closing CTA band: full-bleed photo, radial green shade, centered 48rem content.
 * Used unchanged across the public site so every CTA matches the VIP page.
 */
export function SiteCta({
  title,
  text,
  image,
  children,
  note,
  titleId,
  className,
  photoClassName,
}: {
  title: ReactNode;
  text: string;
  image: SiteImage;
  children?: ReactNode;
  note?: ReactNode;
  titleId?: string;
  className?: string;
  photoClassName?: string;
}) {
  return (
    <section className={cn("site-home-cta site-cta-band site-home-reveal", className)} aria-labelledby={titleId}>
      <Photo image={image} ratio="16 / 9" sizes="100vw" className={cn("site-home-cta__photo", photoClassName)} />
      <div className="site-home-cta__shade" aria-hidden="true" />
      <div className="site-section__inner">
        <div className="site-cta">
          <h2 id={titleId} className="site-cta__title">{title}</h2>
          <p className="site-cta__text">{text}</p>
          {children ? <div className="site-cta__actions">{children}</div> : null}
        </div>
        {note ? <p className="site-cta-band__note">{note}</p> : null}
      </div>
    </section>
  );
}

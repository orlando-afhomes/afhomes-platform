import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { SiteBadge, type SiteBadgeTone } from "./site-badge";

export type SiteFeatureCardProps = {
  href: string;
  title: string;
  /** Kept to two lines by CSS. Write it short. */
  text: string;
  image: { src: string; alt: string };
  badge?: { label: string; tone?: SiteBadgeTone };
  cta?: string;
  /** Shape of the photo. */
  ratio?: string;
  sizes?: string;
  className?: string;
};

/** Clean linked card: a photo with an optional status badge, then the title, a two-line description and a text call to action. */
export function SiteFeatureCard({ href, title, text, image, badge, cta = "Learn more", ratio = "16 / 10", sizes = "(min-width: 1024px) 400px, 100vw", className }: SiteFeatureCardProps) {
  return (
    <div className={cn("site-feature-card", className)}>
      <Link href={href} className="site-feature-card__link" aria-label={`${title}: ${cta.toLowerCase()}`}>
        <span className="site-feature-card__media" style={{ aspectRatio: ratio }}>
          <Image src={image.src} alt={image.alt} fill sizes={sizes} className="site-feature-card__image" />
          {badge ? <SiteBadge tone={badge.tone} className="site-feature-card__badge">{badge.label}</SiteBadge> : null}
        </span>
        <span className="site-feature-card__body">
          <h3 className="site-feature-card__title">{title}</h3>
          <p className="site-feature-card__text">{text}</p>
          <span className="site-feature-card__cta">
            {cta}
            <ArrowRight aria-hidden="true" className="site-feature-card__arrow" />
          </span>
        </span>
      </Link>
    </div>
  );
}

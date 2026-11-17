import Image from "next/image";
import type { ReactNode } from "react";
import { Gem } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type SiteTier = "bronze" | "silver" | "gold";

/** One headline figure: a small icon and label (e.g. "Discount"), a big value (e.g. "25%") and a short note (e.g. "For 20 years"). */
export type SiteTierBenefit = {
  icon?: ReactNode;
  label: string;
  value: string;
  note?: string;
};

export type SiteTierCardProps = {
  tier: SiteTier;
  name: string;
  image: string;
  imageAlt: string;
  benefits: SiteTierBenefit[];
  className?: string;
};

/**
 * Membership tier card on an ivory tile: the card artwork on a tier-coloured showcase panel (a light sheen crosses it on hover), the tier name, and headline figures in one tinted panel.
 * The artwork files carry empty margins around the card; the media box crops them so the shadow follows the real card.
 * Put these inside `.site-tier-grid`.
 */
export function SiteTierCard({ tier, name, image, imageAlt, benefits, className }: SiteTierCardProps) {
  return (
    <article className={cn("site-tier-card", `site-tier-card--${tier}`, className)}>
      <div className="site-tier-card__stage">
        <div className="site-tier-card__media">
          <Image src={image} alt={imageAlt} fill sizes="(min-width: 900px) 340px, 90vw" className="site-tier-card__image" />
        </div>
      </div>
      <h3 className="site-tier-card__name">
        <Gem aria-hidden="true" className="site-tier-card__gem" strokeWidth={1.5} />
        {name}
      </h3>
      <dl className="site-tier-card__stats">
        {benefits.map((benefit) => (
          <div key={benefit.label} className="site-tier-card__stat">
            <dt className="site-tier-card__label">
              {benefit.icon ? <span className="site-tier-card__icon" aria-hidden="true">{benefit.icon}</span> : null}
              {benefit.label}
            </dt>
            <dd className="site-tier-card__value">{benefit.value}</dd>
            {benefit.note ? <dd className="site-tier-card__note">{benefit.note}</dd> : null}
          </div>
        ))}
      </dl>
    </article>
  );
}

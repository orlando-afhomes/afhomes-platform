import type { ReactNode } from "react";
import type { SiteImage } from "@/modules/public-site/content/experiences";
import { SiteBadge, type SiteBadgeTone } from "@/shared/components/site";
import { Photo } from "../site/blocks";

/** Experience page hero: full-bleed photo, dark green on the left, title, status, lede and actions. */
export function ExperienceHero({ eyebrow, title, lede, status, statusTone = "progress", image, children }: { eyebrow: string; title: string; lede: string; status?: string; statusTone?: SiteBadgeTone; image: SiteImage; children?: ReactNode }) {
  return (
    <section className="site-home-hero exp-hero">
      <Photo image={image} ratio="16 / 9" priority sizes="100vw" className="site-home-hero__photo" />
      <div className="site-home-hero__shade" aria-hidden="true" />
      <div className="site-home-hero__inner exp-hero__inner">
        <p className="site-eyebrow site-eyebrow--light">{eyebrow}</p>
        <h1 className="site-home-hero__title exp-hero__title">{title}</h1>
        {status ? <SiteBadge tone={statusTone} className="exp-hero__status">{status}</SiteBadge> : null}
        <p className="site-home-hero__lede">{lede}</p>
        {children ? <div className="site-hero__actions">{children}</div> : null}
      </div>
    </section>
  );
}

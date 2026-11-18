import type { ReactNode } from "react";
import type { SiteImage } from "@/modules/public-site/content/experiences";
import { Photo } from "../site/blocks";

/** Experience page hero: full-bleed photo, dark green on the left, title, lede, status and actions. */
export function ExperienceHero({ eyebrow, title, lede, status, image, children }: { eyebrow: string; title: string; lede: string; status?: string; image: SiteImage; children?: ReactNode }) {
  return (
    <section className="site-home-hero exp-hero">
      <Photo image={image} ratio="16 / 9" priority sizes="100vw" className="site-home-hero__photo" />
      <div className="site-home-hero__shade" aria-hidden="true" />
      <div className="site-home-hero__inner exp-hero__inner">
        <p className="site-eyebrow site-eyebrow--light">{eyebrow}</p>
        <h1 className="site-home-hero__title exp-hero__title">{title}</h1>
        <p className="site-home-hero__lede">{lede}</p>
        {status ? <p className="exp-hero__status">{status}</p> : null}
        {children ? <div className="site-hero__actions">{children}</div> : null}
      </div>
    </section>
  );
}

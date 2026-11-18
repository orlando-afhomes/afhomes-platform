import type { ReactNode } from "react";
import type { SiteImage } from "@/modules/public-site/content/experiences";
import { Photo } from "../site/blocks";

/** Closing band: the Home closing band, centered, deep green over a faint photo. */
export function ExperienceClosing({ title, text, image, children }: { title: string; text: string; image: SiteImage; children?: ReactNode }) {
  return (
    <section className="site-home-cta exp-closing site-home-reveal">
      <Photo image={image} ratio="16 / 9" sizes="100vw" className="site-home-cta__photo" />
      <div className="site-home-cta__shade" aria-hidden="true" />
      <div className="site-section__inner">
        <div className="site-cta">
          <h2 className="site-cta__title">{title}</h2>
          <p className="site-cta__text">{text}</p>
          {children ? <div className="site-cta__actions">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}

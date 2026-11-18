import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { SiteImage } from "@/modules/public-site/content/experiences";
import { Photo } from "../site/blocks";

/** Overview section: eyebrow, serif heading, intro and a row of feature cards. `children` renders centered below the cards. */
export function ExperienceOverview({ id, eyebrow, title, text, features, children }: { id?: string; eyebrow: string; title: string; text: string | string[]; features: { icon: LucideIcon; title: string; text: string }[]; children?: ReactNode }) {
  const paragraphs = Array.isArray(text) ? text : [text];
  return (
    <section id={id} className="site-section exp-overview">
      <div className="site-section__inner">
        <header className="site-heading exp-overview__heading">
          <p className="site-eyebrow">{eyebrow}</p>
          <h2 className="site-heading__title exp-overview__title">{title}</h2>
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="site-heading__text exp-overview__text">{paragraph}</p>
          ))}
        </header>
        <ul className="exp-overview__features">
          {features.map(({ icon: Icon, title: featureTitle, text: featureText }) => (
            <li key={featureTitle} className="exp-overview__feature">
              <span className="exp-overview__icon" aria-hidden="true"><Icon strokeWidth={1.5} /></span>
              <h3 className="exp-overview__feature-title">{featureTitle}</h3>
              <p className="exp-overview__feature-text">{featureText}</p>
            </li>
          ))}
        </ul>
        {children ? <div className="exp-overview__extra">{children}</div> : null}
      </div>
    </section>
  );
}

/** Centered row of white pill badges with a small round logo, e.g. the company registrations. */
export function ExperienceTrust({ items }: { items: { label: string; image: SiteImage }[] }) {
  return (
    <ul className="exp-trust">
      {items.map((item) => (
        <li key={item.label} className="exp-trust__item">
          <Photo image={item.image} ratio="1 / 1" fit="contain" sizes="32px" className="exp-trust__logo" />
          <span className="exp-trust__label">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

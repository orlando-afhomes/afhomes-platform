import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import type { SiteImage } from "@/modules/public-site/content/experiences";
import { OFFICES, PAYMENT_DISCLAIMER, RENDERINGS_NOTE, SITE } from "@/modules/public-site/content/site";
import { PUBLIC_SUPPORT_INFO } from "@/modules/public-site/support-info";
import { cn } from "@/shared/lib/utils";
import { resolveSiteButton, type SiteAction, type SitePrimaryTone, type SiteSurface } from "./site-actions";

/** Photo with a fixed shape. `sizes` keeps next/image from over-fetching. `backdrop` adds a blurred copy behind a contained image. */
export function Photo({ image, ratio = "4 / 3", className, priority = false, sizes = "(min-width: 1024px) 560px, 100vw", fit = "cover", backdrop = false }: { image: SiteImage; ratio?: string; className?: string; priority?: boolean; sizes?: string; fit?: "cover" | "contain"; backdrop?: boolean }) {
  return (
    <span className={cn("site-photo", className)} style={{ aspectRatio: ratio }}>
      {backdrop ? <Image src={image.src} alt="" fill sizes="10vw" aria-hidden="true" className="site-photo__backdrop" /> : null}
      <Image src={image.src} alt={image.alt} fill sizes={sizes} priority={priority} className={fit === "contain" ? "site-photo__image site-photo__image--contain" : "site-photo__image"} />
    </span>
  );
}

export function Section({ id, tone = "plain", children, className }: { id?: string; tone?: "plain" | "soft" | "dark"; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("site-section", `site-section--${tone}`, className)}>
      <div className="site-section__inner">{children}</div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, text, align = "left" }: { eyebrow?: string; title: string; text?: string; align?: "left" | "center" }) {
  return (
    <header className={cn("site-heading", align === "center" && "site-heading--center")}>
      {eyebrow ? <p className="site-eyebrow">{eyebrow}</p> : null}
      <h2 className="site-heading__title">{title}</h2>
      {text ? <p className="site-heading__text">{text}</p> : null}
    </header>
  );
}

export function RenderingsNote() {
  return <p className="site-note">{RENDERINGS_NOTE}</p>;
}

export function PaymentWarning() {
  return <p className="site-callout">{PAYMENT_DISCLAIMER}</p>;
}

export function SiteButton({ href, children, action, surface = "light", primaryTone = "brand", external = false }: { href: string; children: ReactNode; action: SiteAction; surface?: SiteSurface; primaryTone?: SitePrimaryTone; external?: boolean }) {
  const { icon: Icon, className } = resolveSiteButton(action, surface, primaryTone);
  const content = (
    <>
      <Icon aria-hidden="true" />
      {children}
    </>
  );
  // Same-page section links ("#...") use a plain anchor so the browser's smooth scrolling applies.
  if (external || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return <a href={href} className={className} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{content}</a>;
  }
  return <Link href={href} className={className}>{content}</Link>;
}

/** Offices, phone, email and Facebook, copied from the old contact page. */
export function ContactCards() {
  const info = PUBLIC_SUPPORT_INFO;
  return (
    <ul className="site-grid contact-details">
      <li className="site-card site-card--contact">
        <Mail aria-hidden="true" className="site-card__icon" />
        <h2 className="site-card__title">Email</h2>
        <a href={`mailto:${info.email}`} className="site-link">{info.email}</a>
        <a href="#contact-form" className="site-link site-link--muted">Use the contact form</a>
      </li>
      <li className="site-card site-card--contact">
        <Phone aria-hidden="true" className="site-card__icon" />
        <h2 className="site-card__title">Phone</h2>
        <a href={info.phoneHref} className="site-link">{info.phone}</a>
        <a href={SITE.facebookUrl} className="site-link site-link--muted" target="_blank" rel="noopener noreferrer">Send us a message on Facebook</a>
      </li>
      {OFFICES.map((office) => (
        <li key={office.id} className="site-card site-card--contact">
          <MapPin aria-hidden="true" className="site-card__icon" />
          <h2 className="site-card__title">{office.label}</h2>
          <address className="contact-details__address">
            <p className="site-card__text">{office.name}</p>
            <p className="site-card__text">{office.lines.join(", ")}</p>
            {office.landmark ? <p className="site-card__text contact-details__landmark">{office.landmark}</p> : null}
          </address>
        </li>
      ))}
    </ul>
  );
}

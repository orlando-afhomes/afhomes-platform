import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import type { Highlight, SiteImage } from "@/modules/public-site/content/experiences";
import { OFFICES, PAYMENT_DISCLAIMER, RENDERINGS_NOTE, SITE } from "@/modules/public-site/content/site";
import { PUBLIC_SUPPORT_INFO } from "@/modules/public-site/support-info";
import { cn } from "@/shared/lib/utils";

/** Photo with a fixed shape. `sizes` keeps next/image from over-fetching. */
export function Photo({ image, ratio = "4 / 3", className, priority = false, sizes = "(min-width: 1024px) 560px, 100vw", fit = "cover" }: { image: SiteImage; ratio?: string; className?: string; priority?: boolean; sizes?: string; fit?: "cover" | "contain" }) {
  return (
    <span className={cn("site-photo", className)} style={{ aspectRatio: ratio }}>
      <Image src={image.src} alt={image.alt} fill sizes={sizes} priority={priority} className={fit === "contain" ? "site-photo__image site-photo__image--contain" : "site-photo__image"} />
    </span>
  );
}

export function PageHero({ eyebrow, title, lede, status, image, children }: { eyebrow?: string; title: string; lede?: string; status?: string; image?: SiteImage; children?: ReactNode }) {
  return (
    <section className={cn("site-hero", image && "site-hero--image")}>
      <div className="site-hero__inner">
        <div className="site-hero__text">
          {eyebrow ? <p className="site-eyebrow">{eyebrow}</p> : null}
          <h1 className="site-hero__title">{title}</h1>
          {status ? <p className="site-status">{status}</p> : null}
          {lede ? <p className="site-hero__lede">{lede}</p> : null}
          {children ? <div className="site-hero__actions">{children}</div> : null}
        </div>
        {image ? <Photo image={image} ratio="4 / 3" priority className="site-hero__photo" sizes="(min-width: 1024px) 520px, 100vw" /> : null}
      </div>
    </section>
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

/** Responsive grid of titled cards, with an optional picture on each. */
export function HighlightGrid({ items, columns = 3, numbered = false }: { items: Highlight[]; columns?: 2 | 3 | 4; numbered?: boolean }) {
  return (
    <ul className={cn("site-grid", `site-grid--${columns}`)}>
      {items.map((item, index) => (
        <li key={item.title} className="site-card">
          {item.image ? <Photo image={item.image} ratio="3 / 2" className="site-card__photo" sizes="(min-width: 1024px) 360px, 100vw" /> : null}
          <div className="site-card__body">
            {numbered ? <span className="site-card__number">{String(index + 1).padStart(2, "0")}</span> : null}
            <h3 className="site-card__title">{item.title}</h3>
            <p className="site-card__text">{item.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SplitFeature({ image, children, reverse = false, ratio = "4 / 3" }: { image: SiteImage; children: ReactNode; reverse?: boolean; ratio?: string }) {
  return (
    <div className={cn("site-split", reverse && "site-split--reverse")}>
      <Photo image={image} ratio={ratio} className="site-split__photo" />
      <div className="site-split__text">{children}</div>
    </div>
  );
}

export function RenderingsNote() {
  return <p className="site-note">{RENDERINGS_NOTE}</p>;
}

export function PaymentWarning() {
  return <p className="site-callout">{PAYMENT_DISCLAIMER}</p>;
}

export function SiteButton({ href, children, variant = "primary", external = false }: { href: string; children: ReactNode; variant?: "primary" | "outline" | "light" | "outline-light"; external?: boolean }) {
  const className = `site-button site-button--${variant}`;
  if (external || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return <a href={href} className={className} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{children}</a>;
  }
  return <Link href={href} className={className}>{children}</Link>;
}

/** Call to action used at the bottom of most pages. */
export function CtaBand({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <Section tone="dark">
      <div className="site-cta">
        <h2 className="site-cta__title">{title}</h2>
        <p className="site-cta__text">{text}</p>
        <div className="site-cta__actions">{children ?? <SiteButton href="/contact" variant="light">Contact us</SiteButton>}</div>
      </div>
    </Section>
  );
}

/** Offices, phone, email and Facebook, copied from the old contact page. */
export function ContactCards() {
  const info = PUBLIC_SUPPORT_INFO;
  return (
    <ul className="site-grid site-grid--3">
      <li className="site-card site-card--contact">
        <Mail aria-hidden="true" className="site-card__icon" />
        <h3 className="site-card__title">Email</h3>
        <a href={`mailto:${info.email}`} className="site-link">{info.email}</a>
        <Link href="/contact" className="site-link site-link--muted">Use the contact form</Link>
      </li>
      <li className="site-card site-card--contact">
        <Phone aria-hidden="true" className="site-card__icon" />
        <h3 className="site-card__title">Phone</h3>
        <a href={info.phoneHref} className="site-link">{info.phone}</a>
        <a href={SITE.facebookUrl} className="site-link site-link--muted" target="_blank" rel="noopener noreferrer">Send us a message on Facebook</a>
      </li>
      {OFFICES.map((office) => (
        <li key={office.id} className="site-card site-card--contact">
          <MapPin aria-hidden="true" className="site-card__icon" />
          <h3 className="site-card__title">{office.label}</h3>
          <p className="site-card__text">{office.name}</p>
          <p className="site-card__text">{office.lines.join(", ")}</p>
          {office.landmark ? <p className="site-card__text">{office.landmark}</p> : null}
        </li>
      ))}
    </ul>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Info, Map as MapIcon, MapPin, ShieldCheck } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { SiteNavLink } from "./site-nav-types";

export type SiteFooterProps = {
  brand: { name: string; tagline: string; logoSrc: string };
  contacts: { icon: React.ReactNode; label: string; href: string; external?: boolean }[];
  columns: { heading: string; links: SiteNavLink[] }[];
  /** `map` adds a small link under the address, e.g. to a map of that office. */
  locations: { label: string; lines: string[]; landmark?: string; map?: { href: string; label: string } }[];
  legal: { disclaimer?: string; copyright: string };
  className?: string;
};

/** Site footer: brand and contacts, link columns, office addresses, and legal text. */
export function SiteFooter({ brand, contacts, columns, locations, legal, className }: SiteFooterProps) {
  return (
    <footer className={cn("site-footer", className)}>
      <div className="site-footer__grid">
        <div className="site-footer__brand-block">
          <span className="site-footer__logo" aria-hidden="true">
            <Image src={brand.logoSrc} alt="" width={36} height={40} className="site-footer__logo-image" />
          </span>
          <p className="site-footer__name">{brand.name}</p>
          <p className="site-footer__muted">{brand.tagline}</p>
          <div className="site-footer__contacts">
            {contacts.map((contact) => (
              <a
                key={contact.href}
                href={contact.href}
                className="site-footer__contact"
                {...(contact.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                <span className="site-footer__contact-icon" aria-hidden="true">{contact.icon}</span>
                {contact.label}
              </a>
            ))}
          </div>
        </div>

        {columns.map((column) => (
          <nav key={column.heading} aria-label={column.heading} className="site-footer__block">
            <h2 className="site-footer__heading">{column.heading}</h2>
            {column.links.map((link) => (
              <Link key={link.href} href={link.href} className="site-footer__link">{link.label}</Link>
            ))}
            {column.heading === "Access" ? (
              <p className="site-footer__access-note"><Info aria-hidden="true" />Staff and sellers only.</p>
            ) : null}
          </nav>
        ))}

        <div className="site-footer__block site-footer__block--offices">
          <h2 className="site-footer__heading">Our offices</h2>
          {locations.map((location) => (
            <address key={location.label} className="site-footer__office">
              <span className="site-footer__office-icon" aria-hidden="true"><MapPin /></span>
              <span className="site-footer__office-body">
                <strong className="site-footer__office-label">{location.label}</strong>
                {location.lines.map((line) => (
                  <span key={line} className="site-footer__office-line">{line}</span>
                ))}
                {location.landmark ? <span className="site-footer__office-note">{location.landmark}</span> : null}
                {location.map ? (
                  <Link href={location.map.href} className="site-footer__office-map" aria-label={`${location.map.label}: ${location.label}`}>
                    <MapIcon aria-hidden="true" />
                    {location.map.label}
                  </Link>
                ) : null}
              </span>
            </address>
          ))}
        </div>
      </div>

      <div className="site-footer__legal">
        {legal.disclaimer ? (
          <div className="site-footer__disclaimer" role="note" aria-label="Disclaimer">
            <span className="site-footer__disclaimer-icon" aria-hidden="true"><ShieldCheck /></span>
            <div>
              <p className="site-footer__disclaimer-title">Disclaimer</p>
              <p className="site-footer__disclaimer-text">{legal.disclaimer}</p>
            </div>
          </div>
        ) : null}
        <p className="site-footer__copyright">{legal.copyright}</p>
      </div>
    </footer>
  );
}

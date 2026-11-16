import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { DISCLAIMER, EXPERIENCE_LINKS, FOOTER_LINKS, OFFICES, SITE } from "@/modules/public-site/content/site";
import { PUBLIC_SUPPORT_INFO } from "@/modules/public-site/support-info";

export function PublicFooter() {
  const info = PUBLIC_SUPPORT_INFO;
  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div className="site-footer__brand-block">
          <span className="site-footer__logo" aria-hidden="true">
            <Image src="/images/logo.png" alt="" width={36} height={40} className="site-header__logo-image" />
          </span>
          <p className="site-footer__name">{SITE.groupName}</p>
          <p className="site-footer__muted">{SITE.slogan}</p>
        </div>

        <div className="site-footer__block">
          <h2 className="site-footer__heading">Explore</h2>
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="site-footer__link">{link.label}</Link>
          ))}
          {EXPERIENCE_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="site-footer__link">{link.label}</Link>
          ))}
        </div>

        <div className="site-footer__block">
          <h2 className="site-footer__heading">Contact</h2>
          <a href={`mailto:${info.email}`} className="site-footer__link"><Mail aria-hidden="true" className="site-footer__icon" />{info.email}</a>
          <a href={info.phoneHref} className="site-footer__link"><Phone aria-hidden="true" className="site-footer__icon" />{info.phone}</a>
          <a href={SITE.facebookUrl} className="site-footer__link" target="_blank" rel="noopener noreferrer">Facebook page</a>
        </div>

        <div className="site-footer__block">
          <h2 className="site-footer__heading">Our offices</h2>
          {OFFICES.map((office) => (
            <p key={office.id} className="site-footer__office">
              <MapPin aria-hidden="true" className="site-footer__icon" />
              <span>
                <strong>{office.label}</strong>
                <br />
                {office.lines.join(", ")}
                {office.landmark ? <><br />{office.landmark}</> : null}
              </span>
            </p>
          ))}
        </div>
      </div>

      <div className="site-footer__legal">
        <p className="site-footer__disclaimer"><strong>Disclaimer:</strong> {DISCLAIMER}</p>
        <p>© 2026 {SITE.groupName}. All rights reserved.</p>
      </div>
    </footer>
  );
}

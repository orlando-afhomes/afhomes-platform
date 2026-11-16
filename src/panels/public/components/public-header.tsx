import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ACTION_LINKS, EXPERIENCE_LINKS, MAIN_NAV } from "@/modules/public-site/content/site";
import { PublicMobileMenu } from "./public-mobile-menu";

/** Public site header: one bar with the logo, the main menu and the account actions. */
export function PublicHeader() {
  return (
    <header className="site-header">
      <div className="site-header__bar">
        <Link href="/" className="site-header__brand" aria-label="AFhomes home">
          <span className="site-header__logo" aria-hidden="true">
            <Image src="/images/logo.png" alt="" width={28} height={32} priority className="site-header__logo-image" />
          </span>
          <span className="site-header__name">AFhomes</span>
        </Link>

        <nav className="site-header__nav" aria-label="Public">
          {MAIN_NAV.slice(0, 2).map((link) => (
            <Link key={link.href} href={link.href} className="site-header__link">{link.label}</Link>
          ))}
          <div className="site-header__dropdown">
            <button type="button" className="site-header__link site-header__dropdown-button" aria-haspopup="true">
              Experiences <ChevronDown aria-hidden="true" className="site-header__chevron" />
            </button>
            <div className="site-header__panel">
              {EXPERIENCE_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="site-header__panel-link">
                  <span className="site-header__panel-title">{link.label}</span>
                  <span className="site-header__panel-text">{link.description}</span>
                </Link>
              ))}
            </div>
          </div>
          {MAIN_NAV.slice(2).map((link) => (
            <Link key={link.href} href={link.href} className="site-header__link">{link.label}</Link>
          ))}
        </nav>

        <div className="site-header__actions">
          {ACTION_LINKS.map((link, index) => (
            <Link key={link.href} href={link.href} className={index === 0 ? "site-button site-button--primary site-button--small" : "site-button site-button--outline site-button--small"}>{link.label}</Link>
          ))}
        </div>
        <PublicMobileMenu />
      </div>
    </header>
  );
}

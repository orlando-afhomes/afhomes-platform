import { Building2, Crown, MapPin, Search, Store } from "lucide-react";
import { FAQ_INTRO, FAQ_PAGE } from "@/modules/public-site/content/faq";
import { Photo } from "../site/blocks";

const CHIP_ICONS = { building: Building2, amenities: Store, crown: Crown, pin: MapPin } as const;

/** FAQ page hero: the Home hero layout with a search box that filters the questions and quick-help jump links. */
export function FaqHero({ query, onQueryChange }: { query: string; onQueryChange: (value: string) => void }) {
  const { titleStart, titleAccent, image, searchLabel, searchPlaceholder, quickHelpLabel, quickHelp } = FAQ_PAGE.hero;
  return (
    <section className="site-home-hero faq-hero">
      <Photo image={image} ratio="16 / 9" priority sizes="100vw" className="site-home-hero__photo" />
      <div className="site-home-hero__shade" aria-hidden="true" />
      <div className="site-home-hero__inner">
        <p className="site-eyebrow site-eyebrow--light faq-hero__eyebrow">{FAQ_INTRO.lede}</p>
        <h1 className="site-home-hero__title">
          <span className="site-home-hero__line">{titleStart}</span>{" "}
          <span className="site-home-hero__accent faq-hero__accent">{titleAccent}</span>
        </h1>
        <p className="site-home-hero__lede faq-hero__lede">{FAQ_INTRO.text}</p>
        <div className="faq-hero__search">
          <label htmlFor="faq-hero-search" className="tw:sr-only">{searchLabel}</label>
          <Search className="faq-hero__search-icon" aria-hidden="true" />
          <input
            id="faq-hero-search"
            type="search"
            className="faq-hero__search-input"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            autoComplete="off"
          />
        </div>
        <nav className="faq-hero__quick" aria-label="Quick help">
          <span className="faq-hero__quick-label">{quickHelpLabel}</span>
          <ul className="faq-hero__chips">
            {quickHelp.map(({ label, target, icon }) => {
              const Icon = CHIP_ICONS[icon];
              return (
                <li key={target}>
                  <a href={`#${target}`} className="faq-hero__chip" onClick={() => onQueryChange("")}>
                    <Icon className="faq-hero__chip-icon" aria-hidden="true" />
                    {label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </section>
  );
}

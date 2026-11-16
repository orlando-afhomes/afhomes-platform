import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LogIn, ShieldCheck } from "lucide-react";
import { ABOUT } from "@/modules/public-site/content/about";
import { EXPERIENCE_CARDS, ROOMS } from "@/modules/public-site/content/experiences";
import { SITE } from "@/modules/public-site/content/site";
import { VIP_TIERS, formatPoints } from "@/modules/public-site/content/vip";
import { CtaBand, Photo, RenderingsNote, Section, SectionHeading, SiteButton } from "../site/blocks";

export function PublicHomePage() {
  return (
    <>
      <section className="site-home-hero">
        <Photo image={ABOUT.hero} ratio="16 / 9" priority sizes="100vw" className="site-home-hero__photo" />
        <div className="site-home-hero__shade" aria-hidden="true" />
        <div className="site-home-hero__inner">
          <p className="site-eyebrow site-eyebrow--light">{SITE.corporateName}</p>
          <h1 className="site-home-hero__title">{SITE.slogan}</h1>
          <p className="site-home-hero__lede">The first largest homestyle hotspring. A resort developer and operator pioneering all-in-one destinations that feel like home.</p>
          <div className="site-hero__actions">
            <SiteButton href="/vip-privilege" variant="light">Explore the VIP Privilege Card</SiteButton>
            <SiteButton href="/experiences/hotspring-ecofarm-resort" variant="outline-light">See the resort</SiteButton>
          </div>
        </div>
      </section>

      <Section>
        <SectionHeading eyebrow="Our experiences" title="Three destinations, one homestyle spirit" text="Our Alaminos operations are open now, while the flagship resort is built phase by phase." />
        <ul className="site-grid site-grid--3">
          {EXPERIENCE_CARDS.map((card) => (
            <li key={card.href} className="site-card site-card--link">
              <Link href={card.href} className="site-card__link" aria-label={`${card.title}: learn more`}>
                <Photo image={card.image} ratio="4 / 3" className="site-card__photo" sizes="(min-width: 1024px) 380px, 100vw" />
                <div className="site-card__body">
                  <p className="site-status">{card.status}</p>
                  <h3 className="site-card__title">{card.title}</h3>
                  <p className="site-card__text">{card.text}</p>
                  <span className="site-card__more">Learn more <ArrowRight aria-hidden="true" className="site-card__arrow" /></span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="soft">
        <SectionHeading eyebrow="VIP Privilege Card" title="Exclusive access, exceptional benefits" text="Get VIP access rights and privileges to resort-wide perks with our VIP Privilege Loyalty Program." />
        <ul className="site-grid site-grid--3">
          {VIP_TIERS.slice().reverse().map((tier) => (
            <li key={tier.code} className="site-tier-teaser">
              <Image src={tier.image} alt={`${tier.name} VIP Privilege Card`} width={640} height={400} className="site-tier-teaser__card" />
              <p className="site-tier-teaser__name">{tier.name}</p>
              <p className="site-tier-teaser__text">{tier.discountPercent}% discount for {tier.discountYears} years</p>
              <p className="site-tier-teaser__text">{formatPoints(tier.pointsPerYear)} stay points a year</p>
            </li>
          ))}
        </ul>
        <div className="site-center"><SiteButton href="/vip-privilege">Compare the cards</SiteButton></div>
      </Section>

      <Section>
        <SectionHeading eyebrow="Accommodations" title="Explore our cozy and warm accommodations" text="Immerse yourself in the sights and sounds of our resort, where every corner is thoughtfully designed for your comfort, relaxation, and joy." />
        <ul className="site-gallery site-gallery--3" aria-label="Accommodations preview">
          {[ROOMS[0], ROOMS[5], ROOMS[1], ROOMS[2], ROOMS[4], ROOMS[7]].map((room) => (
            <li key={room.id} className="site-gallery__tile">
              <Photo image={room.photos[0]} ratio="4 / 3" sizes="(min-width: 1024px) 360px, 50vw" />
              <span className="site-gallery__caption">{room.name}</span>
            </li>
          ))}
        </ul>
        <RenderingsNote />
        <div className="site-center"><SiteButton href="/experiences/hotspring-ecofarm-resort#accommodations" variant="outline">See all villas and floor plans</SiteButton></div>
      </Section>

      <Section tone="soft">
        <ul className="site-grid site-grid--2">
          <li className="site-action-card">
            <ShieldCheck aria-hidden="true" className="site-action-card__icon" />
            <div>
              <h3 className="site-action-card__title">Verify Accreditation</h3>
              <p className="site-action-card__text">Check that a sales representative is accredited by entering their AA number.</p>
              <SiteButton href="/verify" variant="outline">Verify Accreditation</SiteButton>
            </div>
          </li>
          <li className="site-action-card">
            <LogIn aria-hidden="true" className="site-action-card__icon" />
            <div>
              <h3 className="site-action-card__title">Sales Sign-In</h3>
              <p className="site-action-card__text">For accredited AFhomes sellers.</p>
              <SiteButton href="/login/sales" variant="outline">Sales Sign-In</SiteButton>
            </div>
          </li>
        </ul>
      </Section>

      <CtaBand title="Your home away from home awaits" text="Imagine a place where comfort meets excitement, and every moment feels like a dream come true." />
    </>
  );
}

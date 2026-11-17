import { ArrowDown, ArrowRight, House, ShieldCheck, Tent, TreePine } from "lucide-react";
import { ABOUT } from "@/modules/public-site/content/about";
import { EXPERIENCE_CARDS, RESORT_AMENITIES, ROOM_CATEGORY_LABELS, ROOMS } from "@/modules/public-site/content/experiences";
import { SiteCallout, SiteFeatureCard, SiteRoomCard } from "@/shared/components/site";
import { Photo, Section, SectionHeading, SiteButton } from "../site/blocks";
import { VipTierList } from "../site/vip-tier-list";

const ROOM_ICONS = { villa: <House />, "a-frame": <TreePine />, glamping: <Tent /> };

/** Home page. Layout and copy only; the cards, badges and callout are shared site components. */
export function PublicHomePage() {
  return (
    <div className="site-home">
      <section className="site-home-hero">
        <Photo image={ABOUT.hero} ratio="16 / 9" priority sizes="100vw" className="site-home-hero__photo" />
        <div className="site-home-hero__shade" aria-hidden="true" />
        <div className="site-home-hero__inner">
          <p className="site-eyebrow site-eyebrow--light">AFhomes Resort</p>
          <h1 className="site-home-hero__title">
            <span className="site-home-hero__line">Homestyle Hotspring</span>{" "}
            <em className="site-home-hero__accent">Escape</em>
          </h1>
          <p className="site-home-hero__lede">Pioneering resort destinations that feel like home.</p>
          <div className="site-hero__actions">
            <SiteButton href="/vip-privilege#cards" variant="gold">Join VIP <ArrowRight aria-hidden="true" /></SiteButton>
            <SiteButton href="#experiences" variant="outline-light">Our experiences <ArrowDown aria-hidden="true" /></SiteButton>
          </div>
        </div>
      </section>

      <Section id="experiences">
        <SectionHeading eyebrow="Our experiences" title="Three homestyle destinations" text="Open now in Alaminos, flagship resort coming." />
        <ul className="site-grid site-grid--3">
          {EXPERIENCE_CARDS.map((card) => (
            <li key={card.href} className="site-home-reveal">
              <SiteFeatureCard href={card.href} title={card.title} text={card.text} image={card.image} badge={{ label: card.status, tone: card.statusTone }} />
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="soft">
        <SectionHeading eyebrow="VIP Privilege" title="Exclusive member benefits" text="Enjoy member perks across the entire resort." />
        <VipTierList />
        <div className="site-center"><SiteButton href="/vip-privilege">Compare cards <ArrowRight aria-hidden="true" /></SiteButton></div>
      </Section>

      <Section>
        <SectionHeading eyebrow="Accommodations" title="Cozy, warm accommodations" text="Stays designed for comfort, relaxation, and joy." />
        <ul className="site-room-grid site-home-reveal" aria-label="Accommodations preview">
          {[ROOMS[0], ROOMS[5], ROOMS[1], ROOMS[2], ROOMS[4], ROOMS[7]].map((room) => (
            <li key={room.id}>
              <SiteRoomCard href="/experiences/hotspring-ecofarm-resort#accommodations" name={room.name} category={ROOM_CATEGORY_LABELS[room.category]} icon={ROOM_ICONS[room.category]} image={room.photos[0]} />
            </li>
          ))}
        </ul>
        <div className="site-center"><SiteButton href="/experiences/hotspring-ecofarm-resort#accommodations">View floor plans <ArrowRight aria-hidden="true" /></SiteButton></div>
      </Section>

      <Section tone="soft">
        <SiteCallout
          className="site-home-reveal"
          icon={<ShieldCheck />}
          title="Verify Accreditation"
          text="Check a seller's accreditation by AA number."
          href="/verify"
          cta="Verify now"
        />
      </Section>

      <section className="site-home-cta site-home-reveal">
        <Photo image={RESORT_AMENITIES[4]} ratio="16 / 9" sizes="100vw" className="site-home-cta__photo" />
        <div className="site-home-cta__shade" aria-hidden="true" />
        <div className="site-section__inner">
          <div className="site-cta">
            <h2 className="site-cta__title">Your stay awaits</h2>
            <p className="site-cta__text">Where comfort meets excitement, dreams come true.</p>
            <div className="site-cta__actions"><SiteButton href="/contact" variant="gold">Contact us <ArrowRight aria-hidden="true" /></SiteButton></div>
          </div>
        </div>
      </section>
    </div>
  );
}

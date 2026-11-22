import { ShieldCheck } from "lucide-react";
import { ABOUT } from "@/modules/public-site/content/about";
import { RESORT_AMENITIES, ROOMS } from "@/modules/public-site/content/experiences";
import { SiteCallout } from "@/shared/components/site";
import { Photo, Section, SectionHeading, SiteButton } from "../site/blocks";
import { ExperienceCardList } from "../experience/experience-card-list";
import { OpenStatusBadge } from "../site/open-status-badge";
import { RoomPreviewGrid } from "../site/room-preview-grid";
import { SiteCta } from "../site/site-cta";
import { VipTierList } from "../site/vip-tier-list";
import "../experience/room-details-dialog.css";

/** Home page. Layout and copy only; the cards, badges and callout are shared site components. */
export function PublicHomePage() {
  return (
    <div className="site-home">
      <section className="site-home-hero">
        <Photo image={ABOUT.hero} ratio="16 / 9" priority sizes="100vw" className="site-home-hero__photo" />
        <div className="site-home-hero__shade" aria-hidden="true" />
        <div className="site-home-hero__inner">
          <div className="site-home-hero__top">
            <OpenStatusBadge />
            <p className="site-eyebrow site-eyebrow--light">Your Home Away From Home</p>
          </div>
          <h1 className="site-home-hero__title">
            <span className="site-home-hero__line">Homestyle Hospitality</span>{" "}
            <em className="site-home-hero__accent">Reimagined</em>
          </h1>
          <p className="site-home-hero__lede">A hospitality group creating destinations that feel like home.</p>
          <div className="site-hero__actions">
            <SiteButton href="/vip-privilege#cards" action="join-vip" surface="dark">Join VIP</SiteButton>
            <SiteButton href="#experiences" action="experiences" surface="dark">Our experiences</SiteButton>
          </div>
        </div>
      </section>

      <Section id="experiences">
        <SectionHeading eyebrow="Our experiences" title="Three homestyle destinations" text="Open now in Alaminos, flagship resort coming." />
        <ExperienceCardList />
      </Section>

      <Section tone="soft">
        <SectionHeading eyebrow="VIP Privilege" title="Exclusive member benefits" text="Enjoy member perks across the entire resort." />
        <VipTierList />
        <div className="site-center"><SiteButton href="/vip-privilege" action="compare">Compare cards</SiteButton></div>
      </Section>

      <Section>
        <SectionHeading eyebrow="Accommodations" title="Cozy, warm accommodations" text="Stays designed for comfort, relaxation, and joy." />
        <RoomPreviewGrid rooms={[ROOMS[0], ROOMS[5], ROOMS[1], ROOMS[2], ROOMS[4], ROOMS[7]]} />
        <div className="site-center"><SiteButton href="/experiences/hotspring-ecofarm-resort#accommodations" action="floor-plans">View floor plans</SiteButton></div>
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

      <SiteCta title="Your stay awaits" text="Where comfort meets excitement, dreams come true." image={RESORT_AMENITIES[4]}>
        <SiteButton href="/contact" action="contact" surface="dark" primaryTone="contrast">Contact us</SiteButton>
      </SiteCta>
    </div>
  );
}

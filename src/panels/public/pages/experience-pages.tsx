import { Activity, BedDouble, ChefHat, Coffee, GlassWater, Leaf, Map as MapIcon, Mountain, Waves, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HOTEL_PAGE, KEY_OFFERINGS, RESORT_AMENITIES, RESORT_PAGE, RESTAURANT_PAGE, ROOMS, type Highlight } from "@/modules/public-site/content/experiences";
import { ABOUT } from "@/modules/public-site/content/about";
import { OFFICES } from "@/modules/public-site/content/site";
import { SiteButton } from "../site/blocks";
import { ExperienceHero } from "../experience/exp-hero";
import { ExperienceOverview, ExperienceTrust } from "../experience/exp-overview";
import { ExperienceClosing } from "../experience/exp-closing";
import { ExperienceRooms } from "../experience/exp-rooms";
import { ExperienceAmenities } from "../experience/exp-amenities";
import { ExperiencePhotoCards } from "../experience/exp-cards";
import { ExperienceLocation } from "../experience/exp-location";
import { HotelGallery } from "../experience/exp-hotel-gallery";
import { RestaurantReservation } from "../experience/exp-reservation";
import "../experience/exp-hero.css";
import "../experience/exp-overview.css";
import "../experience/exp-rooms.css";
import "../experience/room-details-dialog.css";
import "../experience/exp-amenities.css";
import "../experience/exp-cards.css";
import "../experience/exp-location.css";
import "../experience/exp-hotel-gallery.css";
import "../experience/exp-reservation.css";

/** Pairs each overview card with its icon, in content order. */
const withIcons = (items: Highlight[], icons: LucideIcon[]) => items.map((item, index) => ({ ...item, icon: icons[index % icons.length] }));

/**
 * Experience detail pages, laid out from the owner's resort detail reference design.
 * The wrapper reuses the Home page styling (`site-home`); `site-experience-page` marks these pages for their own tweaks
 * and the header's "Experiences" underline.
 */
export function ResortPage() {
  const { hero, overview, rooms, amenities, awaits, location, closing } = RESORT_PAGE;
  const resort = OFFICES.find((office) => office.id === "head") ?? OFFICES[0];
  return (
    <div className="site-home site-experience-page site-experience-page--resort">
      <ExperienceHero eyebrow={hero.eyebrow} title={hero.title} lede={hero.lede} status={hero.status} image={hero.image}>
        <SiteButton href="#amenities" action="amenities" surface="dark">View amenities</SiteButton>
        <SiteButton href="/contact" action="contact" surface="dark">Contact us</SiteButton>
      </ExperienceHero>
      <ExperienceOverview id="overview" eyebrow={overview.eyebrow} title={overview.title} text={overview.text} features={withIcons(overview.features, [MapIcon, Waves, Mountain, Leaf])}>
        <ExperienceTrust items={ABOUT.registrations} />
      </ExperienceOverview>
      <ExperienceRooms id="accommodations" eyebrow={rooms.eyebrow} title={rooms.title} text={rooms.text} note={rooms.note} rooms={ROOMS} />
      <ExperienceAmenities id="amenities" eyebrow={amenities.eyebrow} title={amenities.title} text={amenities.text} images={RESORT_AMENITIES} />
      <ExperiencePhotoCards id="lifestyle" eyebrow={awaits.eyebrow} title={awaits.title} text={awaits.text} items={KEY_OFFERINGS} tone="soft" />
      <ExperienceLocation
        id="location"
        eyebrow={location.eyebrow}
        title={location.title}
        activities={location.activities}
        sitePlan={location.sitePlan}
        map={{ ...location.map, embedSrc: resort.map.embedSrc, href: resort.map.href }}
      />
      <ExperienceClosing title={closing.title} text={closing.text} image={closing.image}>
        <SiteButton href="/vip-privilege" action="vip" surface="dark">VIP Privilege</SiteButton>
        <SiteButton href="/contact" action="contact" surface="dark">Contact us</SiteButton>
      </ExperienceClosing>
    </div>
  );
}

export function HotelPage() {
  const { hero, overview, gallery, apnea, lounge, closing } = HOTEL_PAGE;
  return (
    <div className="site-home site-experience-page site-experience-page--hotel">
      <ExperienceHero eyebrow={hero.eyebrow} title={hero.title} lede={hero.lede} status={hero.status} image={hero.image}>
        <SiteButton href="#overview" action="learn" surface="dark">Learn more</SiteButton>
        <SiteButton href="/contact" action="contact" surface="dark">Contact us</SiteButton>
      </ExperienceHero>
      <ExperienceOverview id="overview" eyebrow={overview.eyebrow} title={overview.title} text={overview.text} features={withIcons(overview.features, [BedDouble, Wind, Leaf, Activity])} />
      <HotelGallery id="inside" eyebrow={gallery.eyebrow} title={gallery.title} images={gallery.images} apnea={apnea} />
      <ExperiencePhotoCards id="lounge" eyebrow={lounge.eyebrow} title={lounge.title} text={lounge.text} items={lounge.items} tone="soft" />
      <ExperienceClosing title={closing.title} text={closing.text} image={closing.image}>
        <SiteButton href="/vip-privilege" action="vip" surface="dark">VIP Privilege</SiteButton>
        <SiteButton href="/contact" action="contact" surface="dark">Contact us</SiteButton>
      </ExperienceClosing>
    </div>
  );
}

export function RestaurantPage() {
  const { hero, overview, reservation, closing } = RESTAURANT_PAGE;
  return (
    <div className="site-home site-experience-page site-experience-page--restaurant">
      <ExperienceHero eyebrow={hero.eyebrow} title={hero.title} lede={hero.lede} status={hero.status} image={hero.image}>
        <SiteButton href="#overview" action="learn" surface="dark">Learn more</SiteButton>
        <SiteButton href="/contact" action="contact" surface="dark">Contact us</SiteButton>
      </ExperienceHero>
      <ExperienceOverview id="overview" eyebrow={overview.eyebrow} title={overview.title} text={overview.text} features={withIcons(overview.features, [ChefHat, GlassWater, Coffee])} />
      <RestaurantReservation id="reservations" eyebrow={reservation.eyebrow} title={reservation.title} text={reservation.text} note={reservation.note} image={reservation.image}>
        <SiteButton href="/contact" action="contact">Contact us</SiteButton>
      </RestaurantReservation>
      <ExperienceClosing title={closing.title} text={closing.text} image={closing.image}>
        <SiteButton href="/contact" action="contact" surface="dark">Contact us</SiteButton>
      </ExperienceClosing>
    </div>
  );
}

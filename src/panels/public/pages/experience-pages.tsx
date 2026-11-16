import { HOTEL, KEY_OFFERINGS, NATURAL_FEATURES, RESORT, RESORT_ACTIVITIES, RESORT_AMENITIES, RESTAURANT, ROOMS } from "@/modules/public-site/content/experiences";
import { COMPLIANCE_PHASES } from "@/modules/public-site/content/compliance";
import { ABOUT } from "@/modules/public-site/content/about";
import { CtaBand, HighlightGrid, PageHero, Photo, RenderingsNote, Section, SectionHeading, SiteButton, SplitFeature } from "../site/blocks";
import { ImageGallery, RoomExplorer } from "../site/gallery";

export function ResortPage() {
  return (
    <>
      <PageHero eyebrow={RESORT.banner} title={RESORT.title} lede={RESORT.tagline} status="In development" image={RESORT.masterplan}>
        <SiteButton href="/compliance">See our compliance milestones</SiteButton>
        <SiteButton href="/faq#homestyle" variant="outline">What is a homestyle resort?</SiteButton>
      </PageHero>

      <Section>
        <SectionHeading eyebrow="Natural features and experience" title="A 60-hectare master-planned destination in Laguna" text={RESORT.intro} />
        <HighlightGrid items={NATURAL_FEATURES} />
        <ul className="site-registrations">
          {ABOUT.registrations.map((registration) => (
            <li key={registration.label} className="site-registrations__item">
              <Photo image={registration.image} ratio="1 / 1" fit="contain" className="site-registrations__logo" sizes="96px" />
              <span>{registration.label}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="accommodations" tone="soft">
        <SectionHeading eyebrow="Villas and amenities" title="Where luxury meets convenience" text={RESORT.roomsIntro} />
        <RoomExplorer rooms={ROOMS} />
        <p className="site-note">{RESORT.roomsNote}</p>
        <RenderingsNote />
      </Section>

      <Section>
        <SectionHeading eyebrow="Amenities" title="Fun for every age" text="Pools, a playground, courts, parks and restaurants, all in one gated and guarded resort." />
        <ImageGallery images={RESORT_AMENITIES} label="Resort amenities" columns={3} />
        <RenderingsNote />
      </Section>

      <Section tone="soft">
        <SectionHeading eyebrow="Key offerings" title="What awaits you" />
        <HighlightGrid items={KEY_OFFERINGS} columns={2} />
      </Section>

      <Section>
        <SectionHeading eyebrow="Activities" title={RESORT.activitiesIntro} />
        <ul className="site-chips">
          {RESORT_ACTIVITIES.map((activity) => <li key={activity} className="site-chip">{activity}</li>)}
        </ul>
        <p className="site-note">Built phase by phase, with {COMPLIANCE_PHASES.length} regulatory phases completed.</p>
      </Section>

      <CtaBand title="Experience your home away from home" text="Imagine a place where comfort meets excitement, and every moment feels like a dream come true. Your home away from home awaits!">
        <SiteButton href="/vip-privilege" variant="light">VIP Privilege Card</SiteButton>
        <SiteButton href="/contact" variant="outline-light">Contact us</SiteButton>
      </CtaBand>
    </>
  );
}

export function HotelPage() {
  return (
    <>
      <PageHero eyebrow={HOTEL.eyebrow} title={HOTEL.title} lede={HOTEL.lede} status={HOTEL.status} image={HOTEL.hero}>
        <SiteButton href="/contact">Contact us</SiteButton>
      </PageHero>

      <Section>
        <SplitFeature image={HOTEL.gallery[0]} ratio="4 / 3">
          <SectionHeading eyebrow="Smart wellness rooms" title="Every room is an adaptive ecosystem" text={HOTEL.intro} />
        </SplitFeature>
        <HighlightGrid items={HOTEL.features} columns={2} numbered />
      </Section>

      <Section tone="soft">
        <SectionHeading title={HOTEL.apnea.title} text={HOTEL.apnea.text} />
        <Photo image={HOTEL.apnea.image} ratio="1600 / 390" className="site-banner-photo" sizes="(min-width: 1200px) 1100px, 100vw" />
        <ImageGallery images={HOTEL.gallery.slice(1)} label="Hotel photos" columns={2} />
      </Section>

      <Section>
        <SectionHeading eyebrow="Beyond the rooms" title={HOTEL.lounge.title} text={HOTEL.lounge.text} />
        <HighlightGrid items={HOTEL.lounge.items} />
      </Section>

      <CtaBand title="Grand opening: November 2026" text="Ask us about the AFhomes Smart Wellness Hotel and your VIP Privilege Card." />
    </>
  );
}

export function RestaurantPage() {
  return (
    <>
      <PageHero eyebrow="Alaminos, Laguna" title={RESTAURANT.title} lede={RESTAURANT.tagline} status={RESTAURANT.status} image={RESTAURANT.hero}>
        <SiteButton href="/contact">Contact us</SiteButton>
      </PageHero>

      <Section>
        <div className="site-prose">
          {RESTAURANT.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </Section>

      <Section tone="soft">
        <HighlightGrid items={RESTAURANT.sections} />
      </Section>

      <Section>
        <div className="site-prose">
          <p>{RESTAURANT.closing}</p>
        </div>
        <p className="site-callout">{RESTAURANT.reservation}</p>
      </Section>

      <CtaBand title="Japanese tradition meets modern sophistication" text="Contact our office to plan your dinner or celebration." />
    </>
  );
}

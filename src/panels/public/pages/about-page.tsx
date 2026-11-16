import { ABOUT } from "@/modules/public-site/content/about";
import { KEY_OFFERINGS, NATURAL_FEATURES } from "@/modules/public-site/content/experiences";
import { SITE } from "@/modules/public-site/content/site";
import { CtaBand, HighlightGrid, PageHero, Photo, Section, SectionHeading, SiteButton, SplitFeature } from "../site/blocks";

export function AboutPage() {
  return (
    <>
      <PageHero eyebrow={ABOUT.banner} title={ABOUT.title} lede={ABOUT.subtitle} image={ABOUT.hero}>
        <SiteButton href="/contact">Contact us</SiteButton>
        <SiteButton href="/compliance" variant="outline">See our compliance</SiteButton>
      </PageHero>

      <Section>
        <div className="site-prose">
          {ABOUT.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </Section>

      <Section tone="soft">
        <SectionHeading eyebrow={ABOUT.nowOpen.title} title="Immediate, elite service in Alaminos" text={ABOUT.nowOpen.text} />
        <div className="site-two-up">
          <article className="site-panel">
            <p className="site-status">{ABOUT.restaurant.status}</p>
            <h3 className="site-panel__title">{ABOUT.restaurant.title}</h3>
            <p>{ABOUT.restaurant.text}</p>
            <HighlightGrid items={ABOUT.restaurant.points} columns={2} />
            <SiteButton href="/experiences/alm-japanese-restaurant" variant="outline">See the restaurant</SiteButton>
          </article>
          <article className="site-panel">
            <p className="site-status">{ABOUT.hotel.status}</p>
            <h3 className="site-panel__title">{ABOUT.hotel.title}</h3>
            <p>{ABOUT.hotel.text}</p>
            <h4 className="site-panel__sub">The “Smart Sleep” advantage</h4>
            <HighlightGrid items={ABOUT.hotel.advantage} columns={2} />
            <SiteButton href="/experiences/smart-wellness-hotel" variant="outline">See the hotel</SiteButton>
          </article>
        </div>
        <div className="site-prose site-prose--wide">
          <h3>The benefits of an oxygen-enriched stay</h3>
          <p>{ABOUT.hotel.oxygenIntro}</p>
        </div>
        <HighlightGrid items={ABOUT.hotel.oxygen} columns={3} />
        <p className="site-callout">{ABOUT.hotel.analytics}</p>
      </Section>

      <Section>
        <SectionHeading eyebrow="Flagship project: in development" title="AFhomes Hotspring & Ecofarm Resort (Calauan, Laguna)" text="Our flagship 60-hectare master-planned destination is our most ambitious project to date. Due to the massive scale of this development and our commitment to rigorous environmental and governmental compliance, this project is being built phase by phase." />
        <HighlightGrid items={NATURAL_FEATURES} />
        <div className="site-center"><SiteButton href="/experiences/hotspring-ecofarm-resort">Explore the resort</SiteButton></div>
      </Section>

      <Section tone="soft">
        <SplitFeature image={ABOUT.transparency.image} ratio="16 / 11">
          <SectionHeading eyebrow="Registered and regulated" title={ABOUT.transparency.title} text={ABOUT.transparency.text} />
          <ul className="site-registrations">
            {ABOUT.registrations.map((registration) => (
              <li key={registration.label} className="site-registrations__item">
                <Photo image={registration.image} ratio="1 / 1" fit="contain" className="site-registrations__logo" sizes="96px" />
                <span>{registration.label}</span>
              </li>
            ))}
          </ul>
        </SplitFeature>
      </Section>

      <Section>
        <SectionHeading eyebrow="Why AFhomes?" title="A category we created" />
        <HighlightGrid items={ABOUT.why} numbered />
      </Section>

      <Section tone="soft">
        <SectionHeading eyebrow={ABOUT.vip.title} title="Your VIP privilege is more than a card" text={ABOUT.vip.text} />
        <blockquote className="site-quote">{ABOUT.vip.quote}</blockquote>
        <div className="site-center"><SiteButton href="/vip-privilege">See the VIP Privilege Card</SiteButton></div>
      </Section>

      <Section>
        <SectionHeading eyebrow="Key offerings" title="What awaits at the resort" />
        <HighlightGrid items={KEY_OFFERINGS} columns={2} />
      </Section>

      <Section tone="soft">
        <div className="site-two-up">
          <article className="site-panel"><h3 className="site-panel__title">Our vision</h3><p>{ABOUT.vision}</p></article>
          <article className="site-panel"><h3 className="site-panel__title">Our mission</h3><p>{ABOUT.mission}</p></article>
        </div>
      </Section>

      <Section>
        <SplitFeature image={ABOUT.logo.image} ratio="1 / 1" reverse>
          <SectionHeading eyebrow="The AFhomes brand" title={ABOUT.logo.title} text={ABOUT.logo.text} />
          <HighlightGrid items={ABOUT.logo.colors} columns={2} />
        </SplitFeature>
        <div className="site-prose site-prose--wide">
          <h3>The AFhomes culture</h3>
          <p>AFhomes is a company built on good faith, mission, and gratitude. We believe in a culture that is joyful and open.</p>
        </div>
      </Section>

      <Section tone="soft">
        <SplitFeature image={ABOUT.visit.map} ratio="6 / 5" reverse>
          <SectionHeading eyebrow={SITE.corporateName} title={ABOUT.visit.title} text={ABOUT.visit.address} />
          <p>{ABOUT.visit.travel}</p>
          <p>{ABOUT.visit.text}</p>
        </SplitFeature>
      </Section>

      <CtaBand title="Visit us or get in touch" text="Our satellite office in Alaminos is open to answer your questions." />
    </>
  );
}

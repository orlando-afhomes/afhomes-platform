"use client";

import { ArrowDownRight, BadgeCheck, Coins, Gift, ReceiptText, ScanLine, Sparkles } from "lucide-react";
import { usePublicOffers } from "@/data/public-content-queries";
import { img } from "@/modules/public-site/content/experiences";
import { formatDate } from "@/shared/lib/format-date";
import { Photo, Section, SiteButton } from "../site/blocks";
import { SiteCta } from "../site/site-cta";

const HERO_IMAGE = img("hotel/teppan-scene-2-ps-1-1024x683", "Teppanyaki dining at the ALM Japanese Restaurant");
const COUNTER_IMAGE = img("hotel/2-coffee-wine-bar-1-1024x683", "The coffee and wine bar");
const POOL_IMAGE = img("resort/amenities-w-pool-with-fountain", "A resort pool with a fountain");
const LOUNGE_IMAGE = img("resort/amenities-w-terraces-pool1", "The resort terrace pool");

const FACTS = [
  { title: "Earn", text: "Points come only from eligible bills after Finance approval. A scan identifies you; it never adds points by itself." },
  { title: "Use", text: "Every reward names its outlet and point cost. The counter records the reward after checking your ID and balance." },
  { title: "Keep", text: "Promo Points are their own wallet. They never mix with the Annual Welcome Gift Stay Points in your membership." },
];

const STEPS = [
  { title: "Pay an eligible bill", text: "Participating restaurants and outlets can earn Promo Points when the bill qualifies for the offer.", icon: ReceiptText },
  { title: "Finance approves it", text: "Only a verified bill creates points, once per bill and promo. Reversals keep the original entry on record.", icon: BadgeCheck },
  { title: "Choose your reward", text: "Scan your membership QR at the counter, verify your ID, and use a named reward while your balance covers its cost.", icon: Gift },
];

/** Public Promo Points offers. Only published, complete, date-valid offers reach this page. */
export function PublicOffersPage() {
  const offers = usePublicOffers();

  return (
    <div className="site-home site-offers">
      <section className="offers-hero" aria-labelledby="offers-title">
        <div className="offers-hero__copy">
          <div className="offers-hero__inner">
            <p className="site-eyebrow site-eyebrow--light">Promo Points</p>
            <h1 id="offers-title" className="offers-hero__title">
              <span className="site-home-hero__line">Earn on the bill.</span>
              <span className="site-home-hero__accent">Return for more.</span>
            </h1>
            <p className="offers-hero__lede">
              Earn points on approved bills. Spend them on named rewards at AFhomes outlets.
            </p>
            <div className="site-hero__actions">
              <SiteButton href="#current-offers" action="explore" surface="dark" primaryTone="contrast">See current offers</SiteButton>
              <SiteButton href="#how-it-works" action="learn" surface="dark">How it works</SiteButton>
            </div>
          </div>
        </div>
        <div className="offers-hero__media">
          <Photo image={HERO_IMAGE} ratio="4 / 3" priority sizes="(min-width: 900px) 52vw, 100vw" className="offers-hero__photo" />
          <aside className="offers-hero__pass" aria-label="Promo Points at a glance">
            <p className="offers-hero__pass-label"><Coins aria-hidden="true" /> Promo Points</p>
            <p className="offers-hero__pass-line">Earned on approved bills</p>
            <p className="offers-hero__pass-line">Spent on named rewards</p>
            <p className="offers-hero__pass-foot">No cash value. Separate from Stay Points.</p>
          </aside>
        </div>
      </section>

      <section className="offers-facts" aria-label="Promo Points rules">
        <div className="offers-facts__inner">
          {FACTS.map((fact) => (
            <article key={fact.title} className="offers-fact site-home-reveal">
              <h2 className="offers-fact__title">{fact.title}</h2>
              <p className="offers-fact__text">{fact.text}</p>
            </article>
          ))}
        </div>
      </section>

      <Section id="current-offers" className="offers-current">
        <div className="offers-current__heading">
          <div>
            <p className="site-eyebrow">Live offers</p>
            <h2 className="offers-current__title">Current offers</h2>
          </div>
          <p className="offers-current__intro">Only published, in-date offers with complete reward terms appear here. Every reward shows its outlet and point cost.</p>
        </div>

        {offers.isPending ? <p role="status" className="offers-status">Loading offers…</p> : null}
        {offers.isError ? <p role="alert" className="offers-status offers-status--error">Offers are unavailable right now. Please try again later.</p> : null}

        {offers.data?.length === 0 ? (
          <div className="offers-empty">
            <div className="offers-empty__mark" aria-hidden="true"><Gift /></div>
            <div className="offers-empty__body">
              <h3 className="offers-empty__title">No active offers right now</h3>
              <p className="offers-empty__text">New offers appear here once the office publishes complete reward terms. Your points and Stay Points are not affected.</p>
              <p className="offers-empty__text">Have a bill to check? Bring it to the counter or ask us which outlets are participating.</p>
            </div>
            <div className="offers-empty__actions">
              <SiteButton href="/vip-privilege" action="vip">View VIP Privilege</SiteButton>
              <SiteButton href="/contact" action="contact">Contact us</SiteButton>
            </div>
          </div>
        ) : null}

        {offers.data?.length ? (
          <div className="offers-list">
            {offers.data.map((offer) => (
              <article key={offer.id} className="offers-offer">
                <div className="offers-offer__when">
                  <p className="site-eyebrow site-eyebrow--light">Offer dates</p>
                  <p className="offers-offer__dates">{formatDate(offer.startDate)} to {formatDate(offer.endDate)}</p>
                  <p className="offers-offer__earn">Earn at {offer.earnOutlets.join(", ")}</p>
                  {offer.pointsExpiryDate ? <p className="offers-offer__expiry">Use points by {formatDate(offer.pointsExpiryDate)}</p> : <p className="offers-offer__expiry">Points do not expire.</p>}
                </div>
                <div className="offers-offer__body">
                  <h3 className="offers-offer__title">{offer.title}</h3>
                  <p className="offers-offer__summary">{offer.summary}</p>
                  <p className="offers-offer__terms">{offer.terms}</p>
                  <p className="offers-offer__note">Promo Points have no cash value. Stay Points remain separate and are used only for eligible overnight stays.</p>
                </div>
                <div className="offers-offer__rewards">
                  <p className="offers-offer__rewards-label"><Sparkles aria-hidden="true" /> Rewards</p>
                  <ul className="offers-offer__reward-list">
                    {offer.rewards.map((reward) => (
                      <li key={reward.id} className="offers-offer__reward">
                        <span className="offers-offer__cost">{reward.pointsCost.toLocaleString("en-PH")}<small> points</small></span>
                        <span className="offers-offer__reward-name">{reward.name}</span>
                        <span className="offers-offer__reward-meta">at {reward.outletName}</span>
                        {reward.description ? <span className="offers-offer__reward-text">{reward.description}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </Section>

      <section id="how-it-works" className="site-section offers-how">
        <div className="site-section__inner offers-how__grid">
          <div className="offers-how__intro">
            <p className="site-eyebrow">How it works</p>
            <h2 className="offers-how__title">From bill to reward</h2>
            <p className="offers-how__text">The counter checks the bill, your identity, and your balance before anything moves.</p>
          </div>
          <ol className="offers-how__steps">
            {STEPS.map(({ title, text, icon: Icon }) => (
              <li key={title} className="offers-how__step">
                <span className="offers-how__icon" aria-hidden="true"><Icon /></span>
                <div>
                  <h3 className="offers-how__step-title">{title}</h3>
                  <p className="offers-how__step-text">{text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="offers-how__media">
            <Photo image={COUNTER_IMAGE} ratio="3 / 4" sizes="(min-width: 1000px) 30vw, 90vw" className="offers-how__photo" />
            <p className="offers-how__caption">At the counter, a scan selects you. It never adds or removes points by itself.</p>
          </div>
        </div>
      </section>

      <section className="site-section offers-compare">
        <div className="site-section__inner">
          <div className="offers-compare__banner">
            <Photo image={POOL_IMAGE} ratio="21 / 9" sizes="100vw" className="offers-compare__banner-photo" />
            <div className="offers-compare__banner-shade" aria-hidden="true" />
            <p className="offers-compare__banner-text">Two wallets. One membership.</p>
          </div>
          <div className="offers-compare__grid">
            <article className="offers-compare__panel offers-compare__panel--promo">
              <p className="site-eyebrow site-eyebrow--light">Promo Points</p>
              <h2 className="offers-compare__title">From approved bills</h2>
              <ul className="offers-compare__list">
                <li><BadgeCheck aria-hidden="true" /> Earned at participating outlets</li>
                <li><Gift aria-hidden="true" /> Spent on named rewards</li>
                <li><ScanLine aria-hidden="true" /> Used after QR and ID checks</li>
                <li><Coins aria-hidden="true" /> No cash value</li>
              </ul>
              <a href="#current-offers" className="offers-compare__link">See current offers <ArrowDownRight aria-hidden="true" /></a>
            </article>
            <article className="offers-compare__panel offers-compare__panel--stay">
              <p className="site-eyebrow">Stay Points</p>
              <h2 className="offers-compare__title">From the Annual Welcome Gift</h2>
              <ul className="offers-compare__list">
                <li><Gift aria-hidden="true" /> Released by yearly qualifying spend</li>
                <li><BadgeCheck aria-hidden="true" /> Used for eligible overnight stays</li>
                <li><Sparkles aria-hidden="true" /> Kept in a separate wallet</li>
                <li><Coins aria-hidden="true" /> Governed by the signed Grant</li>
              </ul>
              <a href="/vip-privilege" className="offers-compare__link">View VIP Privilege <ArrowDownRight aria-hidden="true" /></a>
            </article>
          </div>
        </div>
      </section>

      <SiteCta title="Make the next visit count." text="Check the current offers before you arrive, or ask the office which outlets are participating." image={LOUNGE_IMAGE}>
        <SiteButton href="/contact" action="contact" surface="dark" primaryTone="contrast">Contact us</SiteButton>
        <SiteButton href="#current-offers" action="explore" surface="dark">See current offers</SiteButton>
      </SiteCta>
    </div>
  );
}

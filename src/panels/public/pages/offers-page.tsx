"use client";

import { usePublicOffers } from "@/data/promo-queries";
import { Section, SectionHeading } from "../site/blocks";
import { formatDate } from "@/shared/lib/format-date";

/** Public Promo Points offers. Only published, complete, date-valid offers reach this page. */
export function PublicOffersPage() {
  const offers = usePublicOffers();

  return (
    <Section tone="soft" className="public-offers">
      <SectionHeading
        eyebrow="Promo Points"
        title="Offers and rewards"
        text="Earn Promo Points on eligible approved bills, then use them at the outlets named by each offer. Stay Points remain separate and are used for eligible stays."
      />
      {offers.isPending ? <p role="status" className="site-note">Loading offers…</p> : null}
      {offers.isError ? <p role="alert" className="site-callout">Offers are unavailable right now. Please try again later.</p> : null}
      {offers.data?.length === 0 ? (
        <div className="site-card public-offers__empty">
          <h3 className="site-card__title">No active offers right now</h3>
          <p className="site-card__text">Check back soon. Only published offers with complete reward terms appear here.</p>
        </div>
      ) : null}
      {offers.data?.length ? (
        <ul className="site-grid public-offers__grid">
          {offers.data.map((offer) => (
            <li key={offer.id} className="site-card public-offers__card">
              <p className="site-eyebrow">{formatDate(offer.startDate)} – {formatDate(offer.endDate)}</p>
              <h3 className="site-card__title">{offer.title}</h3>
              <p className="site-card__text">{offer.summary}</p>
              <div>
                <h4 className="public-offers__label">Rewards</h4>
                <ul className="public-offers__rewards">
                  {offer.rewards.map((reward) => (
                    <li key={reward.id}>
                      <span className="tw:font-semibold">{reward.name}</span>
                      <span className="public-offers__reward-meta">{reward.pointsCost.toLocaleString("en-PH")} points at {reward.outletName}</span>
                      {reward.description ? <span className="public-offers__reward-text">{reward.description}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="public-offers__terms">{offer.terms}</p>
              <p className="site-note">Earn points at {offer.earnOutlets.join(", ")}. Promo Points have no cash value.</p>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}

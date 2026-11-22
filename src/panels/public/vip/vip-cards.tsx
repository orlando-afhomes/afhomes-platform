"use client";

import Image from "next/image";
import { Check, Coins, Crown, Gem, Info, Star, type LucideIcon } from "lucide-react";
import { usePublicVipProducts } from "@/data/public-content-queries";
import { formatPoints, VIP_CARD_SEED, VIP_PAGE, VIP_POINTS_NOTE, vipCardView, type VipCardView } from "@/modules/public-site/content/vip";
import { Section, SectionHeading } from "@/panels/public/site/blocks";

const TIER_ICONS: Record<VipCardView["style"], LucideIcon> = { gold: Crown, silver: Gem, bronze: Star };

/** "Choose your card": the approved, publicly listed VIP Privilege Cards side by side. */
export function VipCards() {
  const { cards: copy } = VIP_PAGE;
  const products = usePublicVipProducts();
  const cards = (products.isPending ? VIP_CARD_SEED : (products.data ?? []).map(vipCardView))
    .slice()
    .sort((left, right) => right.totalPoints - left.totalPoints);

  return (
    <Section id="cards" className="vip-cards">
      <SectionHeading eyebrow={copy.eyebrow} title={copy.title} text={copy.text} />
      {cards.length === 0 ? <p className="site-note">No VIP cards are listed right now.</p> : null}
      <ul className="vip-cards__grid" aria-busy={products.isPending}>
        {cards.map((tier) => {
          const TierIcon = TIER_ICONS[tier.style];
          return (
            <li key={tier.code} className={`vip-cards__card vip-cards__card--${tier.style} site-home-reveal`}>
              <span className="vip-cards__media">
                <Image src={tier.image} alt={`${tier.name} VIP Privilege Card`} fill sizes="(min-width: 900px) 380px, 90vw" className="vip-cards__image" />
              </span>
              <h3 className="vip-cards__name">
                <TierIcon aria-hidden="true" className="vip-cards__name-icon" />
                {tier.name}
              </h3>
              <p className="vip-cards__discount">
                <span className="vip-cards__discount-value">{tier.discountPercent}%</span>
                <span className="vip-cards__discount-text">
                  {tier.discountYears === null ? "fixed VIP discount" : `fixed VIP discount for ${tier.discountYears} years`}
                </span>
              </p>
              <ul className="vip-cards__perks">
                {tier.perks.map((perk, index) => (
                  <li key={`${index}-${perk}`} className="vip-cards__perk">
                    <Check aria-hidden="true" className="vip-cards__perk-icon" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <div className="vip-cards__points">
                <p className="vip-cards__points-label">Annual Welcome Gift: Loyalty stay points for accommodation</p>
                <div className="vip-cards__points-row">
                  <span className="vip-cards__points-icon">
                    <Coins aria-hidden="true" />
                  </span>
                  <p className="vip-cards__points-value">
                    <strong>{formatPoints(tier.pointsPerYear)}</strong>
                    <span>points a year</span>
                  </p>
                </div>
                <p className="vip-cards__points-total">
                  Total <strong>{formatPoints(tier.totalPoints)}</strong> over {tier.pointsYears} {tier.pointsYears === 1 ? "year" : "years"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="vip-cards__note">
        <span className="vip-cards__note-icon">
          <Info aria-hidden="true" />
        </span>
        {VIP_POINTS_NOTE}
      </p>
    </Section>
  );
}

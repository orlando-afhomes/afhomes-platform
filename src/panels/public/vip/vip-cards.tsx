import Image from "next/image";
import { Check, Coins, Crown, Gem, Info, Star, type LucideIcon } from "lucide-react";
import { formatPoints, VIP_PAGE, VIP_POINTS_NOTE, VIP_TIER_PERKS, VIP_TIERS, type VipTierSummary } from "@/modules/public-site/content/vip";
import { Section, SectionHeading } from "@/panels/public/site/blocks";

const TIER_ICONS: Record<VipTierSummary["code"], LucideIcon> = { gold: Crown, silver: Gem, bronze: Star };

/** "Choose your card": the three VIP Privilege Cards side by side (owner's reference design, 2026-11-17). */
export function VipCards() {
  const { cards } = VIP_PAGE;
  return (
    <Section id="cards" className="vip-cards">
      <SectionHeading eyebrow={cards.eyebrow} title={cards.title} text={cards.text} />
      <ul className="vip-cards__grid">
        {VIP_TIERS.map((tier) => {
          const TierIcon = TIER_ICONS[tier.code];
          const registration = tier.registration.charAt(0).toLowerCase() + tier.registration.slice(1);
          return (
            <li key={tier.code} className={`vip-cards__card vip-cards__card--${tier.code} site-home-reveal`}>
              <span className="vip-cards__media">
                <Image src={tier.image} alt={`${tier.name} VIP Privilege Card`} fill sizes="(min-width: 900px) 380px, 90vw" className="vip-cards__image" />
              </span>
              <h3 className="vip-cards__name">
                <TierIcon aria-hidden="true" className="vip-cards__name-icon" />
                {tier.name}
              </h3>
              <p className="vip-cards__discount">
                <span className="vip-cards__discount-value">{tier.discountPercent}%</span>
                <span className="vip-cards__discount-text">fixed VIP discount for {tier.discountYears} years</span>
              </p>
              <ul className="vip-cards__perks">
                {[`Registration for ${registration}`, ...VIP_TIER_PERKS].map((perk) => (
                  <li key={perk} className="vip-cards__perk">
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
                  Total <strong>{formatPoints(tier.totalPoints)}</strong> over {tier.discountYears} years
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

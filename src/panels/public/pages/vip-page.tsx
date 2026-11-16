import Image from "next/image";
import { Check } from "lucide-react";
import { PAYMENT_DISCLAIMER, DISCLAIMER } from "@/modules/public-site/content/site";
import { VIP_BENEFITS, VIP_INTRO, VIP_POINTS_NOTE, VIP_TIERS, VIP_TIER_PERKS, formatPoints } from "@/modules/public-site/content/vip";
import { CtaBand, Section, SectionHeading, SiteButton } from "../site/blocks";

export function VipPage() {
  return (
    <>
      <section className="site-hero">
        <div className="site-hero__inner site-hero__inner--center">
          <div className="site-hero__text">
            <p className="site-eyebrow">{VIP_INTRO.eyebrow}</p>
            <h1 className="site-hero__title">{VIP_INTRO.title}</h1>
            <p className="site-hero__lede">{VIP_INTRO.lede}</p>
            <div className="site-hero__actions">
              <SiteButton href="/contact">Contact us today</SiteButton>
              <SiteButton href="/faq#payment" variant="outline">How to pay</SiteButton>
            </div>
          </div>
        </div>
      </section>

      <Section>
        <SectionHeading eyebrow="Choose your card" title="Gold, Silver or Bronze" text="Every card gives a fixed VIP discount on all consumption, free entrance for the cardholder and priority reservation rights." />
        <ul className="site-tiers">
          {VIP_TIERS.map((tier) => (
            <li key={tier.code} className={`site-tier site-tier--${tier.code}`}>
              <Image src={tier.image} alt={`${tier.name} VIP Privilege Card`} width={640} height={400} className="site-tier__card" />
              <h3 className="site-tier__name">{tier.name}</h3>
              <p className="site-tier__discount"><span>{tier.discountPercent}%</span> fixed VIP discount for {tier.discountYears} years</p>
              <ul className="site-tier__list">
                <li><Check aria-hidden="true" className="site-tier__check" />Registration for {tier.registration.charAt(0).toLowerCase() + tier.registration.slice(1)}</li>
                {VIP_TIER_PERKS.map((perk) => <li key={perk}><Check aria-hidden="true" className="site-tier__check" />{perk}</li>)}
              </ul>
              <div className="site-tier__points">
                <p className="site-tier__points-label">Annual Welcome Gift: loyalty stay points for accommodation</p>
                <p className="site-tier__points-value">{formatPoints(tier.pointsPerYear)} <span>points a year</span></p>
                <p className="site-tier__points-total">Total {formatPoints(tier.totalPoints)} over {tier.discountYears} years</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="site-note">{VIP_POINTS_NOTE}</p>
      </Section>

      <Section tone="soft">
        <SectionHeading eyebrow="Benefits" title="What the card grants the Primary Cardholder" />
        <ul className="site-checklist">
          {VIP_BENEFITS.map((benefit) => <li key={benefit}><Check aria-hidden="true" className="site-checklist__icon" />{benefit}</li>)}
        </ul>
      </Section>

      <Section>
        <SectionHeading eyebrow="Important" title="Disclaimer" />
        <ol className="site-disclaimer-list">
          <li>{DISCLAIMER}</li>
          <li>{PAYMENT_DISCLAIMER}</li>
        </ol>
      </Section>

      <CtaBand title="Experience your home away from home" text="Imagine a place where comfort meets excitement, and every moment feels like a dream come true. Your home away from home awaits!">
        <SiteButton href="/contact" variant="light">Contact us today</SiteButton>
      </CtaBand>
    </>
  );
}

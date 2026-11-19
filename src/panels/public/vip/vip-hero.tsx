import Image from "next/image";
import { VIP_INTRO, VIP_PAGE, VIP_TIERS } from "@/modules/public-site/content/vip";
import { Photo, SiteButton } from "../site/blocks";

/** Back to front, as in the owner's VIP reference design: Bronze at the back, Gold in front. */
const FAN_ORDER = ["bronze", "silver", "gold"] as const;

/** VIP Privilege hero: the Home hero layout with the three VIP cards fanned on the right. */
export function VipHero() {
  const fan = FAN_ORDER.map((code) => VIP_TIERS.find((tier) => tier.code === code)).filter((tier) => tier !== undefined);

  return (
    <section className="site-home-hero vip-hero">
      <Photo image={VIP_PAGE.hero.image} ratio="16 / 9" priority sizes="100vw" className="site-home-hero__photo" />
      <div className="site-home-hero__shade" aria-hidden="true" />
      <div className="site-home-hero__inner vip-hero__inner">
        <div className="vip-hero__text">
          <p className="site-eyebrow site-eyebrow--light">{VIP_INTRO.eyebrow}</p>
          <h1 className="site-home-hero__title">
            VIP <em className="site-home-hero__accent">Privilege Card</em>
          </h1>
          <p className="site-home-hero__lede">{VIP_INTRO.lede}</p>
          <div className="site-hero__actions">
            <SiteButton href="/contact" action="contact" surface="dark">Contact us</SiteButton>
            <SiteButton href="/faq#payment" action="payment-steps" surface="dark">Payment steps</SiteButton>
          </div>
        </div>
        <div className="vip-hero__fan" aria-hidden="true">
          {fan.map((tier) => (
            <span key={tier.code} className={`vip-hero__card vip-hero__card--${tier.code}`}>
              <Image src={tier.image} alt="" fill sizes="(min-width: 900px) 480px, 280px" priority className="vip-hero__card-image" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

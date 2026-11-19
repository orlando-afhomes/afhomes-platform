import { ABOUT } from "@/modules/public-site/content/about";
import { Section, SectionHeading, SiteButton } from "../site/blocks";
import { VipTierList } from "../site/vip-tier-list";

/** "Exclusive Member Benefits": the shared VIP tier cards and a link to compare them. */
export function AboutVip() {
  const { vip } = ABOUT;
  return (
    <Section tone="soft" className="about-vip">
      <div className="site-home-reveal">
        <SectionHeading eyebrow={vip.eyebrow} title={vip.title} text={vip.text} />
      </div>
      <VipTierList />
      <div className="site-center">
        <SiteButton href={vip.href} action="compare">
          {vip.cta}
        </SiteButton>
      </div>
    </Section>
  );
}

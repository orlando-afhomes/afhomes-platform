import { BadgePercent, Sparkles } from "lucide-react";
import { VIP_TIERS, formatPoints } from "@/modules/public-site/content/vip";
import { SiteTierCard } from "@/shared/components/site";

/** The three VIP tier cards (Gold first), shared by the Home and About pages. */
export function VipTierList() {
  return (
    <ul className="site-tier-grid">
      {VIP_TIERS.slice().reverse().map((tier) => (
        <li key={tier.code} className="site-home-reveal">
          <SiteTierCard
            tier={tier.code}
            name={tier.name}
            image={tier.image}
            imageAlt={`${tier.name} VIP Privilege Card`}
            benefits={[
              { icon: <BadgePercent />, label: "Discount", value: `${tier.discountPercent}%`, note: `For ${tier.discountYears} years` },
              { icon: <Sparkles />, label: "Stay points", value: formatPoints(tier.pointsPerYear), note: "Every year" },
            ]}
          />
        </li>
      ))}
    </ul>
  );
}

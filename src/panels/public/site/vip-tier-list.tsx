"use client";

import { BadgePercent, Sparkles } from "lucide-react";
import { usePublicVipProducts } from "@/data/public-content-queries";
import { formatPoints, VIP_CARD_SEED, vipCardView } from "@/modules/public-site/content/vip";
import { SiteTierCard } from "@/shared/components/site";

/** The approved, publicly listed VIP tier cards (Bronze first), shared by the Home and About pages. */
export function VipTierList() {
  const products = usePublicVipProducts();
  const cards = (products.isPending ? VIP_CARD_SEED : (products.data ?? []).map(vipCardView))
    .slice()
    .sort((left, right) => left.totalPoints - right.totalPoints);

  return (
    <ul className="site-tier-grid" aria-busy={products.isPending}>
      {cards.map((tier) => (
        <li key={tier.code} className="site-home-reveal">
          <SiteTierCard
            tier={tier.style}
            name={tier.name}
            image={tier.image}
            imageAlt={`${tier.name} VIP Privilege Card`}
            benefits={[
              { icon: <BadgePercent />, label: "Discount", value: `${tier.discountPercent}%`, note: tier.discountYears === null ? "Fixed VIP discount" : `For ${tier.discountYears} years` },
              { icon: <Sparkles />, label: "Stay points", value: formatPoints(tier.pointsPerYear), note: "Every year" },
            ]}
          />
        </li>
      ))}
    </ul>
  );
}

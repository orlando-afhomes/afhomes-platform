"use client";

import { NON_ACTIVE_TIER_CODES } from "@/modules/vip/types";
import { Section } from "@/shared/components/modern/section";
import { ModulePage } from "../components/module-page";

export function TierCodesPage() {
  return (
    <ModulePage
      anyOf={["vip-products"]}
      title="Tier Codes"
      description="Historical and reserved tier codes."
      crumbs={[{ label: "VIP Products", href: "/admin/vip-products" }, { label: "Tier Codes" }]}
    >
      <Section title="Historical and reserved tier codes" description="Shown for reference only. These codes are not active and are never activated automatically.">
        <ul className="tw:flex tw:flex-wrap tw:gap-2">
          {NON_ACTIVE_TIER_CODES.map((item) => (
            <li key={item.code} className="tw:rounded-md tw:border tw:border-border tw:px-2 tw:py-1 tw:text-sm">
              {item.code} · {item.label} <span className="tw:text-muted-foreground">({item.state})</span>
            </li>
          ))}
        </ul>
      </Section>
    </ModulePage>
  );
}

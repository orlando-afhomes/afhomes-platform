"use client";

import { Tag } from "lucide-react";
import { NON_ACTIVE_TIER_CODES } from "@/modules/vip/types";
import { AdminSection } from "@/shared/components/admin";
import { humanize } from "@/shared/lib/humanize";

export function TierCodesPanel() {
  return (
    <AdminSection title="Inactive tier codes" icon={Tag}>
      <ul className="tw:flex tw:flex-wrap tw:gap-2">
        {NON_ACTIVE_TIER_CODES.map((item) => (
          <li key={item.code} className="tw:rounded-md tw:border tw:border-border tw:px-2 tw:py-1 tw:text-sm">
            {item.code} · {item.label} <span className="tw:text-muted-foreground">({humanize(item.state)})</span>
          </li>
        ))}
      </ul>
    </AdminSection>
  );
}

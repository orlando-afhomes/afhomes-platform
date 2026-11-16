"use client";

import { useCallback } from "react";
import { useVipProducts } from "@/data/business-queries";
import { tierDisplayName } from "@/modules/vip/tier-options";
import type { VipTierCode } from "@/modules/vip/types";

export function useTierDisplayName() {
  const { data: products } = useVipProducts();
  return useCallback((code?: VipTierCode | null) => tierDisplayName(code, products), [products]);
}

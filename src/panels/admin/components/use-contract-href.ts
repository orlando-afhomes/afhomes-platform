"use client";

import { useCallback } from "react";
import { useEffectiveModuleIds } from "@/data/queries";

/** Contract detail: Sales contract for Sales or VIP Products viewers, otherwise the Finance collection detail. */
export function useContractHref() {
  const granted = useEffectiveModuleIds();
  return useCallback(
    (id: string) => (granted.has("sales") || granted.has("vip-products") ? `/admin/sales/contracts/${id}` : `/admin/finance/collections/${id}`),
    [granted],
  );
}

/** Admin review of a contract. */
export function useContractReviewHref() {
  return useCallback((id: string) => `/admin/sales/contract-review/${id}`, []);
}

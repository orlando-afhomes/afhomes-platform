"use client";

import { useCallback } from "react";
import { useEffectiveModuleIds } from "@/data/queries";

/** Contract detail lives under the module the viewer can open: Admin products, seller sales, or Finance. */
export function useContractHref() {
  const granted = useEffectiveModuleIds();
  return useCallback(
    (id: string) => {
      if (granted.has("vip-products")) return `/admin/vip-products/contracts/${id}`;
      if (granted.has("sales")) return `/admin/sales/contracts/${id}`;
      return `/admin/finance/contracts/${id}`;
    },
    [granted],
  );
}

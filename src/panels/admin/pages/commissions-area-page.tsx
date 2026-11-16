"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useCommissionRates } from "@/data/business-queries";
import { AreaPage } from "@/shared/components/admin";
import { Button } from "@/shared/ui/button";
import { ADMIN_AREA_TABS, type AdminAreaTabValue } from "../navigation";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { AllowanceReviewPanel } from "./allowance-review-page";
import { CommissionRatesPanel, type RateSaleContext } from "./commission-assignment-page";
import { CommissionRecoveryPanel, CommissionsPanel, useCommissionRecoveryVisible } from "./commissions-page";

function SetRateButton({ onClick }: { onClick: () => void }) {
  const rates = useCommissionRates(true);
  return <Button type="button" disabled={!rates.data} onClick={onClick}>Set Rate</Button>;
}

export function CommissionsAreaPage() {
  const access = useAdminAreaTabAccess("commissions");
  const recoveryVisible = useCommissionRecoveryVisible();
  const params = useSearchParams();
  const saleId = access.rates && params?.get("tab") === "rates" ? params.get("sale") : null;
  const saleRole = params?.get("role") === "DRI" ? "DRI" : "DSC";
  const saleContext: RateSaleContext | undefined = saleId ? { saleId, role: saleRole } : undefined;
  const saleLink = saleId ? `${saleId}:${saleRole}` : "";
  const [seenSaleLink, setSeenSaleLink] = useState(saleLink);
  const [editing, setEditing] = useState(Boolean(saleLink));
  if (seenSaleLink !== saleLink) {
    setSeenSaleLink(saleLink);
    setEditing(Boolean(saleLink));
  }

  const onEditingChange = (open: boolean) => {
    if (!open && saleContext) {
      const url = new URL(window.location.href);
      url.searchParams.delete("sale");
      url.searchParams.delete("role");
      // Pass null so Next synchronizes useSearchParams with the updated URL.
      window.history.replaceState(null, "", url);
    }
    setEditing(open);
  };
  const panels: Record<AdminAreaTabValue<"commissions">, () => ReactNode> = {
    commissions: () => <CommissionsPanel />,
    recovery: () => <CommissionRecoveryPanel />,
    rates: () => <CommissionRatesPanel editing={editing} onEditingChange={onEditingChange} saleContext={saleContext} />,
    allowances: () => <AllowanceReviewPanel />,
  };
  const tabs = ADMIN_AREA_TABS.commissions.map(({ label, value }) => ({
    label,
    value,
    allowed: access[value] && (value !== "recovery" || recoveryVisible),
    render: panels[value],
  }));

  return (
    <AreaPage
      anyOf={["commissions", "sales"]}
      title="Commissions"
      tabs={tabs}
      actions={(active) => {
        if (active === "rates") return <SetRateButton onClick={() => setEditing(true)} />;
        return null;
      }}
    />
  );
}

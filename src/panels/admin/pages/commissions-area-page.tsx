"use client";

import { useState, type ReactNode } from "react";
import { useCommissionRates, useOperation } from "@/data/business-queries";
import { AreaPage } from "@/shared/components/admin";
import { Button } from "@/shared/ui/button";
import { ADMIN_AREA_TABS, type AdminAreaTabValue } from "../navigation";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { AllowanceReviewPanel } from "./allowance-review-page";
import { CommissionRatesPanel } from "./commission-assignment-page";
import { CommissionPayoutsPanel } from "./commission-payouts-page";
import { CommissionRecoveryPanel, CommissionsPanel, useCommissionRecoveryVisible } from "./commissions-page";

function SetRateButton({ onClick }: { onClick: () => void }) {
  const rates = useCommissionRates(true);
  return <Button type="button" disabled={!rates.data} onClick={onClick}>Set rate</Button>;
}

function PrepareListButton({ onClick }: { onClick: () => void }) {
  const canPrepare = useOperation("commission.payout.prepare");
  return canPrepare ? <Button type="button" onClick={onClick}>Prepare payout list</Button> : null;
}

export function CommissionsAreaPage() {
  const access = useAdminAreaTabAccess("commissions");
  const recoveryVisible = useCommissionRecoveryVisible();
  const [editing, setEditing] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const panels: Record<AdminAreaTabValue<"commissions">, () => ReactNode> = {
    commissions: () => <CommissionsPanel />,
    payouts: () => <CommissionPayoutsPanel preparing={preparing} onPreparingChange={setPreparing} />,
    recovery: () => <CommissionRecoveryPanel />,
    rates: () => <CommissionRatesPanel editing={editing} onEditingChange={setEditing} />,
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
        if (active === "payouts") return <PrepareListButton onClick={() => setPreparing(true)} />;
        return null;
      }}
    />
  );
}

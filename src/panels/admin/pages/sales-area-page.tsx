"use client";

import { useState } from "react";
import { AreaPage } from "@/shared/components/admin";
import { ADMIN_AREA_TABS } from "../navigation";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { ContractsActions, ContractsTab } from "./contracts-page";
import { IgpActions, IgpTab, type IgpHeaderDialog } from "./igp-page";
import { SalesTab } from "./sales-page";
import { PrintSchemeGuideButton, SchemeGuidePanel } from "./scheme-guide-page";

export function SalesAreaPage() {
  const access = useAdminAreaTabAccess("sales");
  const [igpDialog, setIgpDialog] = useState<IgpHeaderDialog | null>(null);
  const [igpHistoryOpen, setIgpHistoryOpen] = useState(false);
  const panels = {
    sales: () => <SalesTab />,
    contracts: () => <ContractsTab />,
    igp: () => <IgpTab headerDialog={igpDialog} onHeaderDialogClose={() => setIgpDialog(null)} historyOpen={igpHistoryOpen} onHistoryClose={() => setIgpHistoryOpen(false)} />,
    "scheme-guide": () => <SchemeGuidePanel />,
  };
  const tabs = ADMIN_AREA_TABS.sales.map(({ value, label }) => ({ value, label, allowed: access[value], render: panels[value] }));
  return (
    <AreaPage anyOf={["sales", "vip-products", "finance"]} title="Sales" tabs={tabs}
      actions={(active) => active === "contracts" ? <ContractsActions /> : active === "igp" ? <IgpActions onOpen={setIgpDialog} onOpenHistory={() => setIgpHistoryOpen(true)} /> : active === "scheme-guide" ? <PrintSchemeGuideButton /> : null} />
  );
}

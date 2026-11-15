"use client";

import { useState } from "react";
import { AreaPage } from "@/shared/components/admin";
import { ADMIN_AREA_TABS } from "../navigation";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { ContractReviewTab } from "./contract-review-page";
import { ContractsActions, ContractsTab } from "./contracts-page";
import { IgpActions, IgpTab, type IgpHeaderDialog } from "./igp-page";
import { IgpProjectsActions, IgpProjectsTab } from "./igp-projects-page";
import { SalesTab } from "./sales-page";

export function SalesAreaPage() {
  const access = useAdminAreaTabAccess("sales");
  const [igpDialog, setIgpDialog] = useState<IgpHeaderDialog | null>(null);
  const [igpHistoryOpen, setIgpHistoryOpen] = useState(false);
  const [addingProject, setAddingProject] = useState(false);
  const panels = {
    sales: () => <SalesTab />,
    contracts: () => <ContractsTab />,
    "contract-review": () => <ContractReviewTab />,
    igp: () => <IgpTab headerDialog={igpDialog} onHeaderDialogClose={() => setIgpDialog(null)} historyOpen={igpHistoryOpen} onHistoryClose={() => setIgpHistoryOpen(false)} />,
    projects: () => <IgpProjectsTab adding={addingProject} onAddingClose={() => setAddingProject(false)} />,
  };
  const tabs = ADMIN_AREA_TABS.sales.map(({ value, label }) => ({ value, label, allowed: access[value], render: panels[value] }));
  return (
    <AreaPage anyOf={["sales", "vip-products", "finance"]} title="Sales" tabs={tabs}
      actions={(active) => active === "contracts" ? <ContractsActions /> : active === "igp" ? <IgpActions onOpen={setIgpDialog} onOpenHistory={() => setIgpHistoryOpen(true)} /> : active === "projects" ? <IgpProjectsActions onAdd={() => setAddingProject(true)} /> : null} />
  );
}

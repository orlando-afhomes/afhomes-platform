"use client";

import { AreaPage } from "@/shared/components/admin";
import { ADMIN_AREA_TABS, type AdminAreaTabValue } from "../navigation";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { FinanceCancellationsPanel } from "./finance-cancellations-page";
import { FinanceCollectionsPanel } from "./finance-collections-page";
import { FinanceVerificationPanel } from "./finance-page";
import { PeriodClosePanel } from "./period-close-page";
import { ReconciliationPanel } from "./reconciliation-page";

const PANELS = {
  verification: FinanceVerificationPanel,
  collections: FinanceCollectionsPanel,
  cancellations: FinanceCancellationsPanel,
  "month-end-close": PeriodClosePanel,
  reconciliation: ReconciliationPanel,
} satisfies Record<AdminAreaTabValue<"finance">, React.ComponentType>;

export function FinanceAreaPage() {
  const access = useAdminAreaTabAccess("finance");
  const tabs = ADMIN_AREA_TABS.finance.map(({ label, value }) => {
    const Panel = PANELS[value];
    return { label, value, allowed: access[value], render: () => <Panel /> };
  });

  return <AreaPage anyOf={["finance", "sales", "reports"]} title="Finance" tabs={tabs} />;
}

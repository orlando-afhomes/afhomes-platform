"use client";

import { AreaPage } from "@/shared/components/admin";
import { ADMIN_AREA_TABS, type AdminAreaTabValue } from "../navigation";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { FinanceCancellationsPanel } from "./finance-cancellations-page";
import { FinanceCollectionsPanel } from "./finance-collections-page";
import { FinanceHoldsPanel } from "./finance-holds-page";
import { FinanceVerificationPanel } from "./finance-page";
import { FinancePaymentsPanel } from "./finance-payments-page";
import { HistoryImportPanel } from "./history-import-page";
import { PeriodClosePanel } from "./period-close-page";
import { ReconciliationPanel } from "./reconciliation-page";

const PANELS = {
  verification: FinanceVerificationPanel,
  collections: FinanceCollectionsPanel,
  payments: FinancePaymentsPanel,
  holds: FinanceHoldsPanel,
  cancellations: FinanceCancellationsPanel,
  "month-end-close": PeriodClosePanel,
  reconciliation: ReconciliationPanel,
  "historical-import": HistoryImportPanel,
} satisfies Record<AdminAreaTabValue<"finance">, React.ComponentType>;

export function FinanceAreaPage() {
  const access = useAdminAreaTabAccess("finance");
  const tabs = ADMIN_AREA_TABS.finance.map(({ label, value }) => {
    const Panel = PANELS[value];
    return { label, value, allowed: access[value], render: () => <Panel /> };
  });

  return <AreaPage anyOf={["finance", "sales", "reports"]} title="Finance" tabs={tabs} />;
}

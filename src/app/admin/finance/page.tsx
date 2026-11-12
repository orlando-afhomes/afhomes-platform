import { FinancePage } from "@/panels/admin/pages/finance-page";

// shortcut: the client-only mock auth gate drops this page from instant-navigation validation; remove with the mock login.
export const instant = false;

export default function Page() {
  return <FinancePage />;
}

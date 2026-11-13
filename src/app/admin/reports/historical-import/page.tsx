import { HistoryImportPage } from "@/panels/admin/pages/history-import-page";

// shortcut: the client-only mock auth gate drops this page from instant-navigation validation; remove with the mock login.
export const instant = false;

export default function Page() {
  return <HistoryImportPage />;
}

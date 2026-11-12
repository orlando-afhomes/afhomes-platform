import { CustomerDetailRoute } from "@/panels/admin/pages/business-routes";
import "@/panels/admin/components/customer-detail-panels.css";

// shortcut: the client-only mock auth gate drops this page from instant-navigation validation; remove with the mock login.
export const instant = false;

export default function Page() {
  return <CustomerDetailRoute />;
}

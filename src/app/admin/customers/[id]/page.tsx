import { CustomerDetailRoute } from "@/panels/admin/pages/business-routes";
import "@/panels/admin/components/customer-detail-panels.css";

// The admin shell authenticates client-side, so segments are not validated at instant-navigation time.
export const instant = false;

export default function Page() {
  return <CustomerDetailRoute />;
}

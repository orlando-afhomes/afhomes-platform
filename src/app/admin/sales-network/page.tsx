import { Suspense } from "react";
import { SalesNetworkAreaPage } from "@/panels/admin/pages/sales-network-area-page";

// The admin role is resolved by the client in the mock app.
export const instant = false;

export default function Page() {
  return <Suspense><SalesNetworkAreaPage /></Suspense>;
}

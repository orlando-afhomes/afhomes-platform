import { Suspense } from "react";
import { OrganizationAreaPage } from "@/panels/admin/pages/organization-area-page";

// The admin role is resolved by the client in the mock app.
export const instant = false;

export default function Page() {
  return <Suspense><OrganizationAreaPage /></Suspense>;
}

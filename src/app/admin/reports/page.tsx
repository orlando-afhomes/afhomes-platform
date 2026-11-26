import { Suspense } from "react";
import { ReportsAreaPage } from "@/panels/admin/pages/reports-area-page";

// The admin shell authenticates client-side, so segments are not validated at instant-navigation time.
export const instant = false;

export default function Page() {
  return (
    <Suspense>
      <ReportsAreaPage />
    </Suspense>
  );
}

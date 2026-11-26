import { Suspense } from "react";
import { FinanceAreaPage } from "@/panels/admin/pages/finance-area-page";

// The admin shell authenticates client-side, so segments are not validated at instant-navigation time.
export const instant = false;

export default function Page() {
  return (
    <Suspense>
      <FinanceAreaPage />
    </Suspense>
  );
}

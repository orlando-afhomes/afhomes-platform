import { Suspense } from "react";
import { RedemptionAreaPage } from "@/panels/admin/pages/redemption-page";

// The admin shell authenticates client-side, so segments are not validated at instant-navigation time.
export const instant = false;

export default function Page() {
  return (
    <Suspense>
      <RedemptionAreaPage />
    </Suspense>
  );
}

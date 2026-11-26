import { Suspense } from "react";
import { CommissionsAreaPage } from "@/panels/admin/pages/commissions-area-page";

// The admin shell authenticates client-side, so segments are not validated at instant-navigation time.
export const instant = false;

export default function Page() {
  return (
    <Suspense>
      <CommissionsAreaPage />
    </Suspense>
  );
}

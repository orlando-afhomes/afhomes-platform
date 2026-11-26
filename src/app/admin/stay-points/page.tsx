import { Suspense } from "react";
import { StayPointsAreaPage } from "@/panels/admin/pages/stay-points-page";

// The admin shell authenticates client-side, so segments are not validated at instant-navigation time.
export const instant = false;

export default function Page() {
  return (
    <Suspense>
      <StayPointsAreaPage />
    </Suspense>
  );
}

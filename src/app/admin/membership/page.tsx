import { Suspense } from "react";
import { MembershipAreaPage } from "@/panels/admin/pages/membership-page";

// The admin shell authenticates client-side, so segments are not validated at instant-navigation time.
export const instant = false;

export default function Page() {
  return (
    <Suspense>
      <MembershipAreaPage />
    </Suspense>
  );
}

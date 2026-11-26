import { MyAccountPage } from "@/panels/admin/pages/my-account-page";

// The admin shell authenticates client-side, so segments are not validated at instant-navigation time.
export const instant = false;

export default function Page() {
  return <MyAccountPage />;
}

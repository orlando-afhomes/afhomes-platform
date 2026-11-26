import { AccountsCompatibilityPage } from "@/panels/admin/pages/accounts-compat-page";

// The admin shell authenticates client-side, so segments are not validated at instant-navigation time.
export const instant = false;

export default function Page() {
  return <AccountsCompatibilityPage />;
}

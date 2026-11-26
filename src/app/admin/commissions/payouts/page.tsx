import { redirectToAreaTab, type AreaRedirectPageProps } from "@/panels/admin/area-redirect";

// The admin shell authenticates client-side, so segments are not validated at instant-navigation time.
export const instant = false;

export default async function Page({ searchParams }: AreaRedirectPageProps) {
  // The Payouts tab joined the Commissions tab (month-end payout bar).
  return redirectToAreaTab("commissions", "commissions", searchParams);
}

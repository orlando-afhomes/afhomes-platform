import { redirectToAreaTab, type AreaRedirectPageProps } from "@/panels/admin/area-redirect";

// shortcut: the client-only mock auth gate drops this page from instant-navigation validation; remove with the mock login.
export const instant = false;

export default async function Page({ searchParams }: AreaRedirectPageProps) {
  // The Payouts tab joined the Commissions tab (month-end payout bar).
  return redirectToAreaTab("commissions", "commissions", searchParams);
}

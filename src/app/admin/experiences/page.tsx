import { redirectToAreaTab, type AreaRedirectPageProps } from "@/panels/admin/area-redirect";

// shortcut: the client-only mock auth gate drops this page from instant-navigation validation; remove with the mock login.
export const instant = false;

// Experiences became a Settings tab; the old link still opens it.
export default async function Page({ searchParams }: AreaRedirectPageProps) {
  return redirectToAreaTab("vip-products", "experiences", searchParams);
}

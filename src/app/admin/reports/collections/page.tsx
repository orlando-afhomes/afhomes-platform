import { redirectToAreaTab, type AreaRedirectPageProps } from "@/panels/admin/area-redirect";

// The admin shell authenticates client-side, so segments are not validated at instant-navigation time.
export const instant = false;

export default async function Page({ searchParams }: AreaRedirectPageProps) {
  return redirectToAreaTab("reports", "collections", searchParams);
}

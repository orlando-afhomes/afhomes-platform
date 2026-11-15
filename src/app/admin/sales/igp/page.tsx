import { redirectToAreaTab, type AreaRedirectPageProps } from "@/panels/admin/area-redirect";

export const instant = false;

export default async function Page({ searchParams }: AreaRedirectPageProps) {
  return redirectToAreaTab("sales", "igp", searchParams);
}

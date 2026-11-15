import { redirectToAreaTab, type AreaRedirectPageProps } from "@/panels/admin/area-redirect";

// The target area resolves the mock role on the client.
export const instant = false;

export default function Page({ searchParams }: AreaRedirectPageProps) {
  return redirectToAreaTab("sales-network", "registrations", searchParams);
}
